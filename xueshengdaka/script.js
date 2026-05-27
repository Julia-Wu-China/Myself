// 星期名称
const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 将星期键转换为数字索引（支持数字和中文名称）
function getDayIndex(dayKey) {
    // 如果已经是数字，直接返回
    const num = parseInt(dayKey);
    if (!isNaN(num)) {
        return num;
    }
    // 如果是中文名称，查找对应的索引
    return WEEKDAY_NAMES.indexOf(dayKey);
}

// 获取schedule中某天的课程安排（支持多种数据格式）
function getDaySchedule(course, dayIndex) {
    const weekdayName = WEEKDAY_NAMES[dayIndex];
    const s = course.schedule || {};
    
    // 格式1: 中文星期名称（如 '周三'）
    if (s[weekdayName]) return s[weekdayName];
    
    // 格式2: 0-based 数字（0=周一, 3=周四）- 当前标准格式
    if (s[String(dayIndex)]) return s[String(dayIndex)];
    if (s[dayIndex]) return s[dayIndex];
    
    return null;
}

// 当前选中的学生
let currentStudent = '';

// ===== Firebase 实时同步配置 =====
const firebaseConfig = {
    apiKey: "AIzaSyB6c8QaYpQ7l5fX3W0P1Q2R3T4U5V6W7X8Y9Z0A1S2D3F4G5H6J7K8L9",
    authDomain: "student-course-manager-99999.firebaseapp.com",
    projectId: "student-course-manager-99999",
    storageBucket: "student-course-manager-99999.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef1234567890"
};

// 初始化 Firebase
let firebaseApp = null;
let db = null;
let isCloudSyncEnabled = false;
let syncListener = null;

function initFirebase() {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        isCloudSyncEnabled = true;
        showSyncStatus('✅ 云端同步已连接', '#4CAF50');
        
        // 监听云端数据变化
        setupCloudListener();
        
        // 自动同步本地数据到云端（如果本地有数据）
        autoSyncToCloud();
    } catch (error) {
        console.log('Firebase 初始化失败，使用本地存储:', error.message);
        showSyncStatus('⚠️ 离线模式', '#FF9800');
    }
}

function showSyncStatus(message, color) {
    const statusEl = document.getElementById('syncStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.color = color;
        statusEl.style.display = 'block';
    }
}

async function setupCloudListener() {
    if (!db) return;
    
    try {
        syncListener = db.collection('appData').doc('main').onSnapshot((doc) => {
            if (doc.exists) {
                const cloudData = doc.data();
                console.log('云端数据更新:', cloudData);
                
                // 比较并更新本地数据
                syncFromCloud(cloudData);
            }
        });
    } catch (error) {
        console.error('设置云端监听失败:', error);
    }
}

async function syncFromCloud(cloudData) {
    if (!cloudData) return;
    
    try {
        const localStudents = JSON.stringify(getStudents());
        const cloudStudents = JSON.stringify(cloudData.students || []);
        
        const localPayments = JSON.stringify(getPayments());
        const cloudPayments = JSON.stringify(cloudData.payments || []);
        
        const localCourses = JSON.stringify(getCourses());
        const cloudCourses = JSON.stringify(cloudData.courses || []);
        
        const localAttendance = JSON.stringify(getAttendance());
        const cloudAttendance = JSON.stringify(cloudData.attendance || []);
        
        const localLeaveRecords = JSON.stringify(getLeaveRecords());
        const cloudLeaveRecords = JSON.stringify(cloudData.leaveRecords || []);
        
        // 如果云端数据更新时间更晚，则更新本地
        const localTime = localStorage.getItem('lastSyncTime') || '2000-01-01T00:00:00.000Z';
        const cloudTime = cloudData.lastSyncTime || '2000-01-01T00:00:00.000Z';
        
        if (cloudTime > localTime) {
            // 更新本地数据
            if (cloudStudents !== localStudents && cloudData.students) {
                localStorage.setItem('students', JSON.stringify(cloudData.students));
                _clearCache('students');
            }
            if (cloudPayments !== localPayments && cloudData.payments) {
                localStorage.setItem('payments', JSON.stringify(cloudData.payments));
                _clearCache('payments');
            }
            if (cloudCourses !== localCourses && cloudData.courses) {
                localStorage.setItem('courses', JSON.stringify(cloudData.courses));
                _clearCache('courses');
            }
            if (cloudAttendance !== localAttendance && cloudData.attendance) {
                localStorage.setItem('attendance', JSON.stringify(cloudData.attendance));
                _clearCache('attendance');
            }
            if (cloudLeaveRecords !== localLeaveRecords && cloudData.leaveRecords) {
                localStorage.setItem('leaveRecords', JSON.stringify(cloudData.leaveRecords));
                _clearCache('leaveRecords');
            }
            
            localStorage.setItem('lastSyncTime', cloudTime);
            showSyncStatus('🔄 数据已从云端更新', '#2196F3');
            
            // 刷新页面显示更新后的数据
            setTimeout(() => {
                location.reload();
            }, 500);
        }
    } catch (error) {
        console.error('从云端同步失败:', error);
    }
}

async function syncToCloud() {
    if (!db) {
        alert('云端同步未连接，请检查网络或稍后重试');
        return;
    }
    
    try {
        const data = {
            students: getStudents(),
            payments: getPayments(),
            courses: getCourses(),
            attendance: getAttendance(),
            leaveRecords: getLeaveRecords(),
            lastSyncTime: new Date().toISOString()
        };
        
        await db.collection('appData').doc('main').set(data);
        localStorage.setItem('lastSyncTime', data.lastSyncTime);
        showSyncStatus('✅ 同步成功', '#4CAF50');
        
        setTimeout(() => {
            showSyncStatus('☁️ 实时同步中', '#2196F3');
        }, 2000);
    } catch (error) {
        console.error('同步到云端失败:', error);
        showSyncStatus('❌ 同步失败', '#f44336');
    }
}

async function autoSyncToCloud() {
    if (!db) return;
    
    try {
        const doc = await db.collection('appData').doc('main').get();
        const cloudData = doc.exists ? doc.data() : null;
        
        // 如果云端没有数据，上传本地数据
        if (!cloudData || !cloudData.students || cloudData.students.length === 0) {
            const localStudents = getStudents();
            if (localStudents && localStudents.length > 0) {
                await syncToCloud();
                return;
            }
        }
        
        // 如果本地有数据且云端数据更旧，上传本地数据
        const localTime = localStorage.getItem('lastSyncTime') || '2000-01-01T00:00:00.000Z';
        const cloudTime = cloudData?.lastSyncTime || '2000-01-01T00:00:00.000Z';
        
        if (localTime > cloudTime) {
            await syncToCloud();
        }
    } catch (error) {
        console.error('自动同步失败:', error);
    }
}

function syncWithCloud() {
    if (!isCloudSyncEnabled) {
        initFirebase();
    } else {
        syncToCloud();
    }
}

// ===== localStorage 缓存层 =====
const _cache = {};

function _getCache(key, defaultValue) {
    if (!_cache[key]) {
        _cache[key] = JSON.parse(localStorage.getItem(key) || defaultValue);
    }
    return _cache[key];
}

function _setCache(key, value) {
    _cache[key] = value;
    localStorage.setItem(key, JSON.stringify(value));
}

function _clearCache(key) {
    delete _cache[key];
}

function _clearAllCache() {
    Object.keys(_cache).forEach(k => delete _cache[k]);
}

// 防抖函数
function debounce(fn, delay) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// 带防抖的 renderAllSchedule（用于 onchange 快速切换时避免多次渲染）
const debouncedRenderAllSchedule = debounce(() => renderAllSchedule(), 200);
const debouncedRenderStats = debounce(() => renderStats(), 200);
const debouncedRenderStudentCourses = debounce(() => renderStudentCourses(), 200);

// localStorage 数据操作
function getStudents() {
    return _getCache('students', '[]');
}

function saveStudents(students) {
    _setCache('students', students);
}

function getPayments() {
    return _getCache('payments', '[]');
}

function savePayments(payments) {
    _setCache('payments', payments);
}

function getCourses() {
    return _getCache('courses', '[]');
}

function saveCourses(courses) {
    _setCache('courses', courses);
}

function getAttendance() {
    return _getCache('attendance', '[]');
}

function saveAttendance(attendance) {
    _setCache('attendance', attendance);
}

// 请假记录操作
function getLeaveRecords() {
    return _getCache('leaveRecords', '[]');
}

function saveLeaveRecords(leaveRecords) {
    _setCache('leaveRecords', leaveRecords);
}

// 数据导出功能
function exportData() {
    const data = {
        version: localStorage.getItem('dataVersion') || 'v1',
        students: getStudents(),
        payments: getPayments(),
        courses: getCourses(),
        attendance: getAttendance(),
        leaveRecords: getLeaveRecords(),
        exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `课程管理系统数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('数据导出成功！文件已保存到下载目录。');
}

// 生成分享链接
function generateShareLink() {
    const data = {
        version: localStorage.getItem('dataVersion') || 'v1',
        students: getStudents(),
        payments: getPayments(),
        courses: getCourses(),
        attendance: getAttendance(),
        leaveRecords: getLeaveRecords(),
        shareTime: new Date().toISOString()
    };
    
    // 将数据转换为Base64编码（支持中文）
    const jsonString = JSON.stringify(data);
    const encodedData = base64Encode(jsonString);
    
    // 生成分享链接
    const shareLink = `${window.location.origin}${window.location.pathname}?share=${encodedData}`;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(shareLink).then(() => {
        alert(`🔗 分享链接已复制到剪贴板！\n\n链接有效期：永久有效\n\n使用方法：\n1. 在另一台设备上打开浏览器\n2. 粘贴并访问此链接\n3. 数据将自动同步`);
    }).catch(() => {
        // 如果复制失败，显示链接让用户手动复制
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert(`🔗 分享链接已复制到剪贴板！\n\n链接有效期：永久有效\n\n使用方法：\n1. 在另一台设备上打开浏览器\n2. 粘贴并访问此链接\n3. 数据将自动同步`);
    });
}

// Base64编码（支持中文）
function base64Encode(str) {
    try {
        // 先转换为UTF-8字节数组
        const utf8Bytes = new TextEncoder().encode(str);
        // 转换为Base64
        let result = '';
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        
        for (let i = 0; i < utf8Bytes.length; i += 3) {
            const byte1 = utf8Bytes[i];
            const byte2 = utf8Bytes[i + 1] || 0;
            const byte3 = utf8Bytes[i + 2] || 0;
            
            const enc1 = byte1 >> 2;
            const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4);
            const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6);
            const enc4 = byte3 & 63;
            
            result += base64Chars[enc1] + base64Chars[enc2] + base64Chars[enc3] + base64Chars[enc4];
        }
        
        // 处理填充
        const padding = utf8Bytes.length % 3;
        if (padding > 0) {
            result = result.slice(0, -padding) + '=='.slice(0, padding);
        }
        
        // URL安全编码
        return result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (e) {
        // 降级方案：使用encodeURIComponent
        return encodeURIComponent(jsonString);
    }
}

// Base64解码（支持中文）
function base64Decode(str) {
    try {
        // URL安全解码
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        
        // 处理填充
        const padding = str.length % 4;
        if (padding > 0) {
            str += '='.repeat(4 - padding);
        }
        
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        const bytes = [];
        
        for (let i = 0; i < str.length; i += 4) {
            const enc1 = base64Chars.indexOf(str[i]);
            const enc2 = base64Chars.indexOf(str[i + 1]);
            const enc3 = base64Chars.indexOf(str[i + 2]);
            const enc4 = base64Chars.indexOf(str[i + 3]);
            
            bytes.push((enc1 << 2) | (enc2 >> 4));
            if (enc3 !== 64) bytes.push(((enc2 & 15) << 4) | (enc3 >> 2));
            if (enc4 !== 64) bytes.push(((enc3 & 3) << 6) | enc4);
        }
        
        return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
    } catch (e) {
        // 降级方案：使用decodeURIComponent
        return decodeURIComponent(str);
    }
}

// 从分享链接导入数据
function importFromShareLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareData = urlParams.get('share');
    
    if (!shareData) return;
    
    try {
        // 解码Base64数据（支持中文）
        const jsonString = base64Decode(shareData);
        const data = JSON.parse(jsonString);
        
        if (!data.students || !data.payments || !data.courses) {
            return;
        }
        
        // 询问用户是否导入
        if (!confirm(`发现分享数据！\n\n是否将此数据导入当前设备？\n\n注意：这将覆盖当前设备上的所有数据。`)) {
            // 移除URL参数
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // 导入数据
        localStorage.setItem('students', JSON.stringify(data.students));
        localStorage.setItem('payments', JSON.stringify(data.payments));
        localStorage.setItem('courses', JSON.stringify(data.courses));
        localStorage.setItem('attendance', JSON.stringify(data.attendance || []));
        localStorage.setItem('leaveRecords', JSON.stringify(data.leaveRecords || []));
        localStorage.setItem('dataVersion', data.version || localStorage.getItem('dataVersion'));
        
        // 移除URL参数（清理链接）
        window.history.replaceState({}, document.title, window.location.pathname);
        
        alert('✅ 数据同步成功！页面将自动刷新。');
        location.reload();
        
    } catch (error) {
        console.error('导入分享数据失败:', error);
        // 移除无效的URL参数
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// 数据导入功能
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.students || !data.payments || !data.courses) {
                alert('无效的数据文件！请确保导入的是正确的数据备份文件。');
                return;
            }
            
            if (!confirm('⚠️ 警告：导入数据将覆盖当前所有数据！\n\n确定要继续吗？')) {
                return;
            }
            
            // 备份当前数据（以防万一）
            const backupData = {
                students: getStudents(),
                payments: getPayments(),
                courses: getCourses(),
                attendance: getAttendance(),
                leaveRecords: getLeaveRecords(),
                backupTime: new Date().toISOString()
            };
            localStorage.setItem('backupBeforeImport', JSON.stringify(backupData));
            
            // 导入数据
            localStorage.setItem('students', JSON.stringify(data.students));
            localStorage.setItem('payments', JSON.stringify(data.payments));
            localStorage.setItem('courses', JSON.stringify(data.courses));
            localStorage.setItem('attendance', JSON.stringify(data.attendance || []));
            localStorage.setItem('leaveRecords', JSON.stringify(data.leaveRecords || []));
            localStorage.setItem('dataVersion', data.version || localStorage.getItem('dataVersion'));
            
            alert('数据导入成功！页面将自动刷新。');
            location.reload();
            
        } catch (error) {
            alert('导入失败：' + error.message);
        }
    };
    
    reader.readAsText(file);
    
    // 重置文件输入
    event.target.value = '';
}

// 手动备份数据（保留最近3次备份）
function backupData() {
    const backups = JSON.parse(localStorage.getItem('backups') || '[]');
    const newBackup = {
        timestamp: new Date().toISOString(),
        students: getStudents(),
        payments: getPayments(),
        courses: getCourses(),
        attendance: getAttendance(),
        leaveRecords: getLeaveRecords()
    };
    
    backups.unshift(newBackup);
    
    // 只保留最近3次备份
    if (backups.length > 3) {
        backups.pop();
    }
    
    localStorage.setItem('backups', JSON.stringify(backups));
    alert('数据备份成功！');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取今日日期
function getToday() {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

// 格式化日期对象为YYYY-MM-DD
function formatDate(date) {
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function getCourseEffectiveEndDate(course) {
    if (course.splitDate) {
        return course.splitDate;
    }
    return course.endDate || '2999-12-31';
}

function courseHasHistoricalRecords(course) {
    const todayStr = getToday();
    if ((course.usedHours || 0) > 0) return true;

    const attendance = getAttendance();
    if (attendance.some(a => a.courseId === course.id && a.date < todayStr)) {
        return true;
    }

    const leaveRecords = getLeaveRecords();
    if (leaveRecords.some(l => l.courseId === course.id && l.date < todayStr)) {
        return true;
    }

    return false;
}

// 获取日期天数前
function getDateDaysAgo(days) {
    const now = new Date();
    now.setDate(now.getDate() - days);
    return `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
}

// 获取本周开始日期（周一）
function getWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return formatDate(monday);
}

// 获取本周结束日期（周日）
function getWeekEnd() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));
    return formatDate(sunday);
}

// 学生颜色映射
// 动态颜色缓存，确保同一学生始终使用同一颜色
const studentColorCache = {};

// 预定义一组颜色，用于轮换分配
const COLOR_PALETTE = [
    'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',  // 红色
    'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',  // 蓝色
    'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',  // 绿色
    'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',  // 紫色
    'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',  // 橙色
    'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)',  // 青色
    'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',  // 粉色
    'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',  // 蓝绿
    'linear-gradient(135deg, #ff5722 0%, #d84315 100%)',  // 深橙
    'linear-gradient(135deg, #795548 0%, #5d4037 100%)',  // 棕色
    'linear-gradient(135deg, #607d8b 0%, #455a64 100%)',  // 灰蓝
    'linear-gradient(135deg, #673ab7 0%, #512da8 100%)',  // 深紫
];

// 根据学生名获取颜色（同一学生始终返回同一颜色）
function getStudentColor(studentName) {
    if (studentColorCache[studentName]) {
        return studentColorCache[studentName];
    }
    // 指定学生固定颜色
    if (studentName === '花花') {
        studentColorCache[studentName] = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)'; // 蓝色
        return studentColorCache[studentName];
    }
    if (studentName === '高磊') {
        studentColorCache[studentName] = 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)'; // 绿色
        return studentColorCache[studentName];
    }
    // 简单哈希：将名字各字符码相加取模
    let hash = 0;
    for (let i = 0; i < studentName.length; i++) {
        hash = (hash * 31 + studentName.charCodeAt(i)) & 0xffffffff;
    }
    if (hash < 0) hash = -hash;
    const colorIndex = hash % COLOR_PALETTE.length;
    studentColorCache[studentName] = COLOR_PALETTE[colorIndex];
    return studentColorCache[studentName];
}

// 生成时间槽（每30分钟一个槽）
function generateTimeSlots() {
    const slots = [];
    const courses = getCourses();
    const MIN_MINUTES = 5 * 60 + 30;
    const MAX_MINUTES = 12 * 60 + 30;
    let minTime = MIN_MINUTES;
    let maxTime = MAX_MINUTES;

    courses.forEach(course => {
        if (!course.schedule) return;
        Object.values(course.schedule).forEach(time => {
            if (time.startTime) {
                const [hour, minute] = time.startTime.split(':').map(Number);
                const total = hour * 60 + minute;
                if (!isNaN(total) && total < minTime) minTime = total;
            }
            if (time.endTime) {
                const [hour, minute] = time.endTime.split(':').map(Number);
                const total = hour * 60 + minute;
                if (!isNaN(total) && total > maxTime) maxTime = total;
            }
        });
    });

    minTime = Math.floor(minTime / 30) * 30;
    maxTime = Math.ceil(maxTime / 30) * 30;
    if (minTime < MIN_MINUTES) {
        minTime = MIN_MINUTES;
    }
    if (maxTime <= minTime) {
        maxTime = minTime + 30;
    }

    for (let t = minTime; t < maxTime; t += 30) {
        const start = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
        const end = `${String(Math.floor((t + 30) / 60)).padStart(2, '0')}:${String((t + 30) % 60).padStart(2, '0')}`;
        slots.push(`${start}-${end}`);
    }

    return slots;
}

// 将时间标准化为 HH:MM 格式
function normalizeTime(timeStr) {
    const [hour, min] = timeStr.split(':').map(Number);
    return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// 判断两个时间段是否重叠（严格模式，结束时间等于开始时间不算重叠）
function isTimeOverlap(start1, end1, start2, end2) {
    const s1 = normalizeTime(start1);
    const e1 = normalizeTime(end1);
    const s2 = normalizeTime(start2);
    const e2 = normalizeTime(end2);
    return s1 < e2 && s2 < e1;
}

// 判断两个时间段是否重叠（宽松模式，用于课程分组，结束时间等于开始时间也算重叠）
function isTimeOverlapLoose(start1, end1, start2, end2) {
    const s1 = normalizeTime(start1);
    const e1 = normalizeTime(end1);
    const s2 = normalizeTime(start2);
    const e2 = normalizeTime(end2);
    return s1 <= e2 && s2 <= e1;
}

// 计算课程时长（分钟）
function getDurationMinutes(startTime, endTime) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour - startHour) * 60 + (endMin - startMin);
}

// 计算课程跨越的时间槽数量
function getTimeSlotSpan(slotStart, slotEnd, courseStart, courseEnd) {
    // 如果课程刚好从当前槽开始，计算跨越多少个槽
    if (courseStart === slotStart) {
        const slots = generateTimeSlots();
        let span = 0;
        for (const slot of slots) {
            const [sStart, sEnd] = slot.split('-');
            if (isTimeOverlap(sStart, sEnd, courseStart, courseEnd)) {
                span++;
            }
        }
        return span;
    }
    return 1;
}

// 上一周
function prevWeek() {
    const startDateInput = document.getElementById('scheduleStartDate');
    const endDateInput = document.getElementById('scheduleEndDate');
    
    if (!startDateInput || !endDateInput) return;
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() - 7);
    
    startDateInput.value = formatDate(startDate);
    endDateInput.value = formatDate(endDate);
    
    renderAllSchedule();
}

// 旋转课程表
let scheduleRotated = false;
function rotateSchedule() {
    const container = document.getElementById('scheduleContainer');
    const table = document.getElementById('allScheduleTable');
    if (!container || !table) return;

    if (scheduleRotated) {
        table.style.transform = '';
        table.style.transformOrigin = '';
        table.style.position = '';
        table.style.top = '';
        table.style.left = '';
        table.style.width = '';
        table.style.height = '';
        table.style.margin = '';
        container.style.overflow = '';
        container.style.height = '';
        container.style.maxHeight = '';
    } else {
        const tableWidth = table.offsetWidth;
        const tableHeight = table.offsetHeight;

        table.style.transform = 'rotate(90deg) translate(0, -100%)';
        table.style.transformOrigin = 'top left';
        table.style.position = 'relative';
        table.style.top = '0';
        table.style.left = '0';
        table.style.margin = '0';
        table.style.width = `${tableHeight}px`;
        table.style.height = `${tableWidth}px`;

        container.style.overflow = 'visible';
        container.style.maxHeight = 'none';
        container.style.height = `${tableWidth + 5}px`;
    }
    scheduleRotated = !scheduleRotated;
}

// 下一周
function nextWeek() {
    const startDateInput = document.getElementById('scheduleStartDate');
    const endDateInput = document.getElementById('scheduleEndDate');
    
    if (!startDateInput || !endDateInput) return;
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    
    startDate.setDate(startDate.getDate() + 7);
    endDate.setDate(endDate.getDate() + 7);
    
    startDateInput.value = formatDate(startDate);
    endDateInput.value = formatDate(endDate);
    
    renderAllSchedule();
}

// 获取缴费记录状态
function getPaymentStatus(payment) {
    const remainingHours = payment.totalHours - payment.usedHours;
    const today = getToday();
    
    if (payment.status === 'ended') {
        return { class: 'status-ended', text: '已结束' };
    }
    
    if (payment.endDate && payment.endDate < today) {
        return { class: 'status-expired', text: '已过期' };
    }
    
    if (remainingHours === 0) {
        return { class: 'status-used', text: '已用完' };
    }
    
    if (payment.usedHours > 0) {
        return { class: 'status-partial', text: '使用中' };
    }
    
    return { class: 'status-paid', text: '未使用' };
}

// 渲染缴费记录表格
function renderPaymentTable() {
    let payments = getPayments();
    
    // 获取筛选条件
    const orgFilter = document.getElementById('paymentOrgFilter')?.value || '';
    const statusFilter = document.getElementById('paymentStatusFilter')?.value || '';
    const startDate = document.getElementById('paymentStartDate')?.value || '';
    const endDate = document.getElementById('paymentEndDate')?.value || '';
    
    // 应用筛选
    payments = payments.filter(payment => {
        // 机构筛选
        if (orgFilter && payment.organization !== orgFilter) {
            return false;
        }
        
        // 状态筛选
        if (statusFilter) {
            const status = getPaymentStatus(payment);
            if (statusFilter === 'active' && status.text !== '使用中') return false;
            if (statusFilter === 'unused' && status.text !== '未使用') return false;
            if (statusFilter === 'ended' && status.text !== '已结束') return false;
            if (statusFilter === 'expired' && status.text !== '已过期') return false;
        }
        
        // 日期筛选
        if (startDate && payment.date < startDate) {
            return false;
        }
        if (endDate && payment.date > endDate) {
            return false;
        }
        
        return true;
    });
    
    const tbody = document.getElementById('paymentTable').querySelector('tbody');
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="empty-state">暂无缴费记录</td></tr>';
        return;
    }
    
    let html = '';
    payments.forEach(payment => {
        const remainingHours = payment.totalHours - payment.usedHours;
        const status = getPaymentStatus(payment);
        // 获取原始值，如果不存在则使用当前值（兼容旧数据）
        const originalAmount = payment.originalAmount !== undefined ? payment.originalAmount : payment.amount;
        const originalTotalHours = payment.originalTotalHours !== undefined ? payment.originalTotalHours : payment.totalHours;
        
        html += `<tr>`;
        html += `<td>${payment.date}</td>`;
        html += `<td>${payment.organization || '-'}</td>`;
        html += `<td>¥${originalAmount.toFixed(2)}</td>`;
        html += `<td>${originalTotalHours}</td>`;
        html += `<td>¥${payment.amount.toFixed(2)}</td>`;
        html += `<td>${payment.totalHours}</td>`;
        html += `<td>${payment.usedHours}</td>`;
        html += `<td>${remainingHours}</td>`;
        html += `<td>${payment.endDate || '-'}</td>`;
        html += `<td>${payment.note || '-'}</td>`;
        html += `<td class="${status.class}">${status.text}</td>`;
        html += `<td class="actions">`;
        html += `<button class="btn btn-secondary" style="padding:5px 10px;font-size:12px" onclick="editPayment('${payment.id}')">编辑</button>`;
        html += `<button class="btn btn-danger" style="padding:5px 10px;font-size:12px" onclick="deletePayment('${payment.id}')">删除</button>`;
        if (payment.status !== 'ended' && remainingHours > 0) {
            html += `<button class="btn btn-warning" style="padding:5px 10px;font-size:12px;background:#ff9800;color:white" onclick="showEndPaymentModal('${payment.id}')">结束</button>`;
        }
        if (payment.status === 'active') {
            html += `<button class="btn btn-success" style="padding:5px 10px;font-size:12px;background:#28a745;color:white" onclick="showRenewPaymentModal('${payment.id}')">续费</button>`;
        }
        html += `</td>`;
        html += `</tr>`;
    });
    
    tbody.innerHTML = html;
}

// 更新缴费筛选下拉框
function updatePaymentFilters() {
    const orgSelect = document.getElementById('paymentOrgFilter');
    
    // 更新机构下拉框
    const payments = getPayments();
    const orgs = [...new Set(payments.map(p => p.organization).filter(Boolean))];
    let orgHtml = '<option value="">全部机构</option>';
    orgs.forEach(org => {
        orgHtml += `<option value="${org}">${org}</option>`;
    });
    if (orgSelect) {
        orgSelect.innerHTML = orgHtml;
    }
    
    // 设置默认日期范围（最近一年到今天）
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const startDateInput = document.getElementById('paymentStartDate');
    const endDateInput = document.getElementById('paymentEndDate');
    if (startDateInput) startDateInput.value = formatDate(oneYearAgo);
    if (endDateInput) endDateInput.value = formatDate(today);
}

// 清空缴费筛选条件
function clearPaymentFilters() {
    const orgFilter = document.getElementById('paymentOrgFilter');
    const statusFilter = document.getElementById('paymentStatusFilter');
    const startDateInput = document.getElementById('paymentStartDate');
    const endDateInput = document.getElementById('paymentEndDate');
    
    if (orgFilter) orgFilter.value = '';
    if (statusFilter) statusFilter.value = 'active';
    
    // 重置日期为最近一年到今天
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    if (startDateInput) startDateInput.value = formatDate(oneYearAgo);
    if (endDateInput) endDateInput.value = formatDate(today);
    
    renderPaymentTable();
}

// 更新缴费多选框
function updatePaymentSelect() {
    const optionsList = document.getElementById('paymentOptionsList');
    const payments = getPayments();
    
    optionsList.innerHTML = '';
    
    payments.forEach(payment => {
        const remainingHours = payment.totalHours - payment.usedHours;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = payment.id;
        checkbox.id = `payment_${payment.id}`;
        
        const label = document.createElement('label');
        label.htmlFor = `payment_${payment.id}`;
        const noteText = payment.note ? `-${payment.note}` : '';
        label.textContent = `${payment.date}-${payment.organization || '-'}-${payment.amount}元-剩余${remainingHours}课时${noteText}`;
        
        const div = document.createElement('div');
        div.appendChild(checkbox);
        div.appendChild(label);
        optionsList.appendChild(div);
    });
    
    // 绑定全选事件
    document.getElementById('selectAllPayments').onchange = function() {
        const checkboxes = document.querySelectorAll('#paymentOptionsList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateSelectedPayments();
    };
    
    // 绑定单个选择事件
    const checkboxes = document.querySelectorAll('#paymentOptionsList input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.onchange = updateSelectedPayments;
    });
}

// 切换缴费选择下拉框显示/隐藏
function togglePaymentSelect() {
    const dropdown = document.getElementById('paymentSelectDropdown');
    const header = document.querySelector('.multi-select-header');
    
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        header.classList.add('open');
    } else {
        dropdown.style.display = 'none';
        header.classList.remove('open');
    }
}

// 更新已选择的缴费记录显示
function updateSelectedPayments() {
    const checkboxes = document.querySelectorAll('#paymentOptionsList input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const selectedContainer = document.getElementById('selectedPayments');
    const hiddenInput = document.getElementById('paymentId');
    const selectText = document.getElementById('paymentSelectText');
    
    hiddenInput.value = selectedIds.join(',');
    
    selectedContainer.innerHTML = '';
    
    if (selectedIds.length === 0) {
        selectText.textContent = '请选择缴费记录';
        return;
    }
    
    selectText.textContent = `已选择 ${selectedIds.length} 条`;
    
    const payments = getPayments();
    selectedIds.forEach(id => {
        const payment = payments.find(p => p.id === id);
        if (payment) {
            const item = document.createElement('div');
            item.className = 'selected-item';
            item.innerHTML = `${payment.organization || '-'}<span class="remove-btn" onclick="removePaymentSelection('${id}')">×</span>`;
            selectedContainer.appendChild(item);
        }
    });
}

// 移除单个已选择的缴费记录
function removePaymentSelection(paymentId) {
    const checkbox = document.getElementById(`payment_${paymentId}`);
    if (checkbox) {
        checkbox.checked = false;
        updateSelectedPayments();
    }
}

// 搜索过滤缴费记录选项
function filterPaymentOptions() {
    const searchText = document.getElementById('paymentSearchInput').value.toLowerCase();
    const options = document.querySelectorAll('#paymentOptionsList div');
    
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchText) ? 'block' : 'none';
    });
}

// 点击外部关闭下拉框
document.addEventListener('click', function(e) {
    const container = document.getElementById('paymentMultiSelect');
    if (container && !container.contains(e.target)) {
        const dropdown = document.getElementById('paymentSelectDropdown');
        const header = container.querySelector('.multi-select-header');
        if (dropdown) dropdown.style.display = 'none';
        if (header) header.classList.remove('open');
    }
    const editContainer = document.getElementById('editPaymentMultiSelect');
    if (editContainer && !editContainer.contains(e.target)) {
        const editDropdown = document.getElementById('editPaymentSelectDropdown');
        const editHeader = editContainer.querySelector('.multi-select-header');
        if (editDropdown) editDropdown.style.display = 'none';
        if (editHeader) editHeader.classList.remove('open');
    }
});

// ===== 编辑课程 - 关联缴费记录（可多选） =====
// 切换编辑课程缴费选择下拉框
function toggleEditPaymentSelect() {
    const dropdown = document.getElementById('editPaymentSelectDropdown');
    const header = document.querySelector('#editPaymentMultiSelect .multi-select-header');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        if (header) header.classList.add('open');
    } else {
        dropdown.style.display = 'none';
        if (header) header.classList.remove('open');
    }
}

// 更新编辑课程已选缴费记录显示
function updateEditSelectedPayments() {
    const checkboxes = document.querySelectorAll('#editPaymentOptionsList input[type="checkbox"]:checked');
    const selectedIds = Array.from(checkboxes).map(cb => cb.value);
    const selectedContainer = document.getElementById('editSelectedPayments');
    const hiddenInput = document.getElementById('editPaymentId');
    const selectText = document.getElementById('editPaymentSelectText');
    
    hiddenInput.value = selectedIds.join(',');
    selectedContainer.innerHTML = '';
    
    if (selectedIds.length === 0) {
        selectText.textContent = '请选择缴费记录';
        return;
    }
    
    selectText.textContent = `已选择 ${selectedIds.length} 条`;
    
    const payments = getPayments();
    selectedIds.forEach(id => {
        const payment = payments.find(p => p.id === id);
        if (payment) {
            const item = document.createElement('div');
            item.className = 'selected-item';
            item.innerHTML = `${payment.organization || '-'}<span class="remove-btn" onclick="removeEditPaymentSelection('${id}')">×</span>`;
            selectedContainer.appendChild(item);
        }
    });
}

// 移除编辑课程单个已选缴费记录
function removeEditPaymentSelection(paymentId) {
    const checkbox = document.getElementById(`editPayment_${paymentId}`);
    if (checkbox) {
        checkbox.checked = false;
        updateEditSelectedPayments();
    }
}

// 编辑课程缴费记录搜索过滤
function filterEditPaymentOptions() {
    const searchText = document.getElementById('editPaymentSearchInput').value.toLowerCase();
    const options = document.querySelectorAll('#editPaymentOptionsList div');
    options.forEach(option => {
        const text = option.textContent.toLowerCase();
        option.style.display = text.includes(searchText) ? 'block' : 'none';
    });
}

// 初始化编辑课程缴费多选框（根据已有的paymentId预选）
function initEditPaymentSelect(preSelectedIds) {
    const optionsList = document.getElementById('editPaymentOptionsList');
    const payments = getPayments();
    
    optionsList.innerHTML = '';
    
    const idSet = new Set(preSelectedIds || []);
    
    payments.forEach(payment => {
        const remainingHours = payment.totalHours - payment.usedHours;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = payment.id;
        checkbox.id = `editPayment_${payment.id}`;
        if (idSet.has(payment.id)) {
            checkbox.checked = true;
        }
        
        const label = document.createElement('label');
        label.htmlFor = `editPayment_${payment.id}`;
        const noteText = payment.note ? `-${payment.note}` : '';
        label.textContent = `${payment.date}-${payment.organization || '-'}-${payment.amount}元-剩余${remainingHours}课时${noteText}`;
        
        const div = document.createElement('div');
        div.appendChild(checkbox);
        div.appendChild(label);
        optionsList.appendChild(div);
    });
    
    // 绑定全选事件
    document.getElementById('editSelectAllPayments').onchange = function() {
        const checkboxes = document.querySelectorAll('#editPaymentOptionsList input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateEditSelectedPayments();
    };
    
    // 绑定单个选择事件
    const checkboxes = document.querySelectorAll('#editPaymentOptionsList input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.onchange = updateEditSelectedPayments;
    });
    
    // 更新已选显示
    updateEditSelectedPayments();
}
// ===== 编辑课程缴费选择结束 =====

// 添加缴费记录
function showAddPaymentModal() {
    document.getElementById('addPaymentModal').style.display = 'flex';
    document.getElementById('paymentDate').value = getToday();
    document.getElementById('paymentOrganization').value = '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentHours').value = '';
    document.getElementById('addPaymentEndDate').value = '2999-12-31';
    document.getElementById('paymentNote').value = '';
}

function closeAddPaymentModal() {
    document.getElementById('addPaymentModal').style.display = 'none';
}

function addPayment() {
    const date = document.getElementById('paymentDate').value;
    const organization = document.getElementById('paymentOrganization').value;
    const amountInput = document.getElementById('paymentAmount').value;
    const hoursInput = document.getElementById('paymentHours').value;
    const endDate = document.getElementById('addPaymentEndDate').value;
    const note = document.getElementById('paymentNote').value;
    
    // 金额可以为空或为0，默认为0
    const amount = amountInput ? parseFloat(amountInput) : 0;
    
    // 课时数可以为空或为0，默认为0
    const hours = hoursInput ? parseInt(hoursInput) : 0;
    
    if (!date || !organization || !endDate) {
        alert('请填写缴费日期、机构名称和有效截止日期');
        return;
    }
    
    const payment = {
        id: generateId(),
        date,
        organization,
        amount,
        totalHours: hours,
        usedHours: 0,
        endDate,
        status: 'active',
        note,
        originalAmount: amount,      // 课包总价（不变）
        originalTotalHours: hours    // 课包总课时（不变）
    };
    
    const payments = getPayments();
    payments.push(payment);
    savePayments(payments);
    
    renderPaymentTable();
    updatePaymentSelect();
    closeAddPaymentModal();
    
    alert('缴费记录添加成功');
}

// 删除缴费记录
function deletePayment(paymentId) {
    const payments = getPayments();
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) return;
    
    if (payment.usedHours > 0) {
        alert(`无法删除此缴费记录，已有 ${payment.usedHours} 课时被使用。`);
        return;
    }
    
    if (!confirm('确定要删除这笔缴费记录吗？')) {
        return;
    }
    
    const newPayments = payments.filter(p => p.id !== paymentId);
    savePayments(newPayments);
    
    const courses = getCourses();
    courses.forEach(course => {
        if (course.paymentId === paymentId) {
            course.paymentId = '';
        }
    });
    saveCourses(courses);
    
    renderPaymentTable();
    updatePaymentSelect();
    renderStudentCourses();
    
    alert('缴费记录已删除');
}

// 显示结束缴费记录模态框
function showEndPaymentModal(paymentId) {
    const payments = getPayments();
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) return;
    
    const remainingHours = payment.totalHours - payment.usedHours;
    const refundAmount = (payment.amount * remainingHours / payment.totalHours).toFixed(2);
    
    document.getElementById('endPaymentId').value = payment.id;
    document.getElementById('endPaymentOrganization').value = payment.organization || '-';
    document.getElementById('endPaymentAmount').value = '¥' + payment.amount.toFixed(2);
    document.getElementById('endPaymentTotalHours').value = payment.totalHours;
    document.getElementById('endPaymentUsedHours').value = payment.usedHours;
    document.getElementById('endPaymentRemainingHours').value = remainingHours;
    document.getElementById('endPaymentRefundAmount').value = '¥' + refundAmount;
    
    // 存储原始剩余课时用于切换显示
    document.getElementById('endPaymentRemainingHours').dataset.original = remainingHours;
    
    document.getElementById('endPaymentModal').style.display = 'flex';
    
    // 默认选中退费，更新剩余课时显示为0
    updateRemainingHoursDisplay();
}

// 当退费方式改变时更新剩余课时显示
function updateRemainingHoursDisplay() {
    const refundType = document.querySelector('input[name="refundType"]:checked').value;
    const remainingHoursInput = document.getElementById('endPaymentRemainingHours');
    const originalRemaining = parseInt(remainingHoursInput.dataset.original) || 0;
    
    if (refundType === 'refund') {
        // 退费：剩余课时清零
        remainingHoursInput.value = 0;
    } else {
        // 不退费：显示原始剩余课时
        remainingHoursInput.value = originalRemaining;
    }
}

function closeEndPaymentModal() {
    document.getElementById('endPaymentModal').style.display = 'none';
}

function endPayment() {
    const paymentId = document.getElementById('endPaymentId').value;
    const refundType = document.querySelector('input[name="refundType"]:checked').value;
    
    const payments = getPayments();
    const paymentIndex = payments.findIndex(p => p.id === paymentId);
    
    if (paymentIndex === -1) return;
    
    const payment = payments[paymentIndex];
    const remainingHours = payment.totalHours - payment.usedHours;
    
    if (refundType === 'refund') {
        payment.amount = payment.amount * payment.usedHours / payment.totalHours;
        payment.totalHours = payment.usedHours;
    } else {
        payment.totalHours = payment.usedHours;
    }
    
    payment.status = 'ended';
    
    savePayments(payments);
    closeEndPaymentModal();
    renderPaymentTable();
    updatePaymentSelect();
    
    alert('缴费记录已结束');
}

// 续费相关函数
function showRenewPaymentModal(paymentId) {
    const payments = getPayments();
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) return;
    
    const remainingHours = payment.totalHours - payment.usedHours;
    
    document.getElementById('renewPaymentId').value = payment.id;
    document.getElementById('renewOrgInfo').value = `${payment.date} - ${payment.organization || '-'}`;
    document.getElementById('renewRemainingHours').value = remainingHours;
    document.getElementById('renewEndDate').value = payment.endDate || '2999-12-31';
    document.getElementById('renewAmount').value = '';
    document.getElementById('renewHours').value = '';
    document.getElementById('renewNote').value = '';
    
    document.getElementById('renewPaymentModal').style.display = 'flex';
}

function closeRenewPaymentModal() {
    document.getElementById('renewPaymentModal').style.display = 'none';
}

function renewPayment() {
    const paymentId = document.getElementById('renewPaymentId').value;
    const endDate = document.getElementById('renewEndDate').value;
    const amountInput = document.getElementById('renewAmount').value;
    const hoursInput = document.getElementById('renewHours').value;
    const note = document.getElementById('renewNote').value;
    
    // 金额可以为空或为0，默认为0
    const amount = amountInput ? parseFloat(amountInput) : 0;
    
    // 课时数可以为空或为0，默认为0
    const hours = hoursInput ? parseInt(hoursInput) : 0;
    
    if (!endDate) {
        alert('请填写有效截止日期');
        return;
    }
    
    const payments = getPayments();
    const originalPayment = payments.find(p => p.id === paymentId);
    
    if (!originalPayment) return;
    
    // 新建一条缴费记录
    const newPayment = {
        id: generateId(),
        date: getToday(), // 缴费日期取今天
        organization: originalPayment.organization, // 机构名称与原记录相同
        amount: amount,
        totalHours: hours,
        usedHours: 0,
        endDate: endDate,
        status: 'active',
        note: note || '',
        originalAmount: amount,
        originalTotalHours: hours
    };
    
    payments.push(newPayment);
    savePayments(payments);
    closeRenewPaymentModal();
    renderPaymentTable();
    updatePaymentSelect();
    
    alert('续费成功，已创建新的缴费记录');
}

// 编辑缴费记录
function editPayment(paymentId) {
    const payments = getPayments();
    const payment = payments.find(p => p.id === paymentId);
    
    if (!payment) return;
    
    document.getElementById('editPaymentModal').style.display = 'flex';
    document.getElementById('editPaymentId').value = payment.id;
    document.getElementById('editPaymentDate').value = payment.date;
    document.getElementById('editPaymentOrganization').value = payment.organization || '';
    document.getElementById('editPaymentAmount').value = payment.amount;
    document.getElementById('editPaymentHours').value = payment.totalHours;
    document.getElementById('editPaymentUsedHours').value = payment.usedHours;
    document.getElementById('editPaymentEndDate').value = payment.endDate || '';
    document.getElementById('editPaymentNote').value = payment.note || '';
}

function closeEditPaymentModal() {
    document.getElementById('editPaymentModal').style.display = 'none';
}

function updatePayment() {
    const paymentId = document.getElementById('editPaymentId').value;
    const payments = getPayments();
    const paymentIndex = payments.findIndex(p => p.id === paymentId);
    
    if (paymentIndex === -1) return;
    
    const date = document.getElementById('editPaymentDate').value;
    const organization = document.getElementById('editPaymentOrganization').value;
    const amount = parseFloat(document.getElementById('editPaymentAmount').value);
    const totalHours = parseInt(document.getElementById('editPaymentHours').value);
    const usedHours = parseInt(document.getElementById('editPaymentUsedHours').value);
    const endDate = document.getElementById('editPaymentEndDate').value;
    const note = document.getElementById('editPaymentNote').value;
    
    if (!date || !organization || !amount || !totalHours || !endDate) {
        alert('请填写完整信息');
        return;
    }
    
    if (totalHours < usedHours) {
        alert(`总课时不能小于已用课时（已用 ${usedHours} 课时）`);
        return;
    }
    
    const remainingHours = totalHours - usedHours;

    // 如果原记录已有消费或原缴费日期不晚于今天，则保留历史：截断原记录到昨天并新建一条从今天生效的记录（不修改历史数据）
    const originalPayment = payments[paymentIndex];
    const todayStr = getToday();
    const paymentDateNormalized = originalPayment.date || '';

    if ((originalPayment.usedHours || 0) > 0 || (paymentDateNormalized && paymentDateNormalized <= todayStr)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);

        // 截断原记录（保留 usedHours 等历史字段）
        payments[paymentIndex] = {
            ...originalPayment,
            endDate: yesterdayStr,
            status: 'ended'
        };

        // 新建一条从今天生效的记录，未来使用此记录
        const newPayment = {
            id: generateId(),
            date: todayStr,
            organization,
            amount,
            totalHours,
            usedHours: 0,
            endDate,
            status: 'active',
            note,
            originalAmount: amount,
            originalTotalHours: totalHours
        };

        payments.push(newPayment);
        savePayments(payments);
        closeEditPaymentModal();
        renderPaymentTable();
        updatePaymentSelect();
        alert('已保留历史记录并创建新的缴费记录用于之后的消费，历史数据未被改写。');
        return;
    }

    // 否则直接更新原记录（未发生过消费且未生效）
    payments[paymentIndex] = {
        ...payments[paymentIndex],
        date,
        organization,
        amount,
        totalHours,
        usedHours,
        endDate,
        note,
        // 如果原来是已结束状态，且剩余课时大于0，则恢复为使用中状态
        status: payments[paymentIndex].status === 'ended' && remainingHours > 0 ? 'active' : payments[paymentIndex].status
    };

    savePayments(payments);
    closeEditPaymentModal();
    renderPaymentTable();
    updatePaymentSelect();

    alert('缴费记录已更新');
}

// 渲染星期时间设置面板
function renderWeekdayTimePanel(checkboxContainerId, panelId, scheduleData = {}) {
    const checkboxes = document.querySelectorAll(`#${checkboxContainerId} input:checked`);
    const panel = document.getElementById(panelId);
    const weekdays = Array.from(checkboxes).map(input => input.value);
    
    if (weekdays.length === 0) {
        panel.innerHTML = '<div class="empty-state"><p>请先选择上课星期</p></div>';
        return;
    }
    
    let html = '';
    weekdays.forEach(day => {
        const existingSchedule = scheduleData[day] || { startTime: '09:00', endTime: '10:30' };
        html += `
            <div class="weekday-time-item">
                <span class="weekday-label">${WEEKDAY_NAMES[parseInt(day)]}</span>
                <div class="time-inputs">
                    <input type="time" id="${panelId}_start_${day}" value="${existingSchedule.startTime}" required>
                    <span>至</span>
                    <input type="time" id="${panelId}_end_${day}" value="${existingSchedule.endTime}" required>
                </div>
            </div>
        `;
    });
    
    panel.innerHTML = html;
}

// 获取星期时间数据
function getWeekdayTimeData(panelId, weekdays) {
    const schedule = {};
    weekdays.forEach(day => {
        const startTime = document.getElementById(`${panelId}_start_${day}`)?.value;
        const endTime = document.getElementById(`${panelId}_end_${day}`)?.value;
        if (startTime && endTime) {
            schedule[day] = { startTime, endTime };
        }
    });
    return schedule;
}

// 学生选择器渲染
let _statsFiltersEventBound = false;

function _bindStatsFilterEvents() {
    if (_statsFiltersEventBound) return;
    _statsFiltersEventBound = true;
    
    document.getElementById('statsStudentFilter')?.addEventListener('change', function() {
        const filterOrg = document.getElementById('statsOrgFilter')?.value || '';
        updateStatsCourseFilter(this.value, filterOrg);
        document.getElementById('statsCourseFilter').value = '';
    });
    
    document.getElementById('statsOrgFilter')?.addEventListener('change', function() {
        const filterStudent = document.getElementById('statsStudentFilter')?.value || '';
        updateStatsCourseFilter(filterStudent, this.value);
        document.getElementById('statsCourseFilter').value = '';
    });
}

function renderStudentSelector() {
    const students = getStudents();
    const selector = document.getElementById('studentSelector');
    
    selector.innerHTML = '<div class="add-student-btn" onclick="showAddStudentModal()">+ 添加学生</div>';
    
    students.forEach(student => {
        const tag = document.createElement('div');
        tag.className = `student-tag ${currentStudent === student ? 'active' : 'inactive'}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = student;
        nameSpan.onclick = () => selectStudent(student);
        tag.appendChild(nameSpan);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteStudent(student);
        };
        tag.appendChild(deleteBtn);
        
        selector.appendChild(tag);
    });
    
    updateStudentSelect();
    updateScheduleStudentFilter();
    updateDetailStudentFilter();
    updateStatsStudentFilter();
    updateStatsOrgFilter();
    updateStatsCourseFilter();
    
    // 筛选器联动事件只绑定一次
    _bindStatsFilterEvents();
}

function updateStudentSelect() {
    const select = document.getElementById('studentName');
    const students = getStudents();
    select.innerHTML = '<option value="">请选择学生</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student;
        option.textContent = student;
        select.appendChild(option);
    });
}

function updateScheduleStudentFilter() {
    const select = document.getElementById('scheduleStudentFilter');
    const students = getStudents();
    select.innerHTML = '<option value="">全部学生</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student;
        option.textContent = student;
        select.appendChild(option);
    });
}

function updateDetailStudentFilter() {
    const select = document.getElementById('detailStudentFilter');
    const students = getStudents();
    select.innerHTML = '<option value="">全部学生</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student;
        option.textContent = student;
        select.appendChild(option);
    });
}

function updateStatsStudentFilter() {
    const select = document.getElementById('statsStudentFilter');
    const students = getStudents();
    select.innerHTML = '<option value="">全部学生</option>';
    
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student;
        option.textContent = student;
        select.appendChild(option);
    });
}

function updateStatsOrgFilter() {
    const select = document.getElementById('statsOrgFilter');
    const payments = getPayments();
    const orgs = [...new Set(payments.map(p => p.organization).filter(Boolean))];
    select.innerHTML = '<option value="">全部机构</option>';
    
    orgs.sort().forEach(org => {
        const option = document.createElement('option');
        option.value = org;
        option.textContent = org;
        select.appendChild(option);
    });
}

function updateStatsCourseFilter(filterStudent = '', filterOrg = '') {
    const select = document.getElementById('statsCourseFilter');
    const courses = getCourses();
    const payments = getPayments();
    
    let filteredCourses = courses;
    
    // 根据学生筛选
    if (filterStudent) {
        filteredCourses = filteredCourses.filter(c => c.studentName === filterStudent);
    }
    
    // 根据机构筛选
    if (filterOrg) {
        const orgPayments = payments.filter(p => p.organization === filterOrg).map(p => p.id);
        filteredCourses = filteredCourses.filter(c => orgPayments.includes(c.paymentId));
    }
    
    const courseNames = [...new Set(filteredCourses.map(c => c.courseName).filter(Boolean))];
    select.innerHTML = '<option value="">全部课程</option>';
    
    courseNames.sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

// 学生选择
function selectStudent(studentName) {
    currentStudent = studentName;
    renderStudentSelector();
    renderStudentCourses();
    renderStats();
    renderAttendance();
}

// 添加学生
function showAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'flex';
    document.getElementById('newStudentName').value = '';
}

function closeAddStudentModal() {
    document.getElementById('addStudentModal').style.display = 'none';
}

function addStudent() {
    const name = document.getElementById('newStudentName').value.trim();
    
    if (!name) {
        alert('请输入学生姓名');
        return;
    }
    
    const students = getStudents();
    if (students.includes(name)) {
        alert('该学生已存在');
        return;
    }
    
    students.push(name);
    saveStudents(students);
    
    closeAddStudentModal();
    renderStudentSelector();
    
    alert('学生添加成功');
}

// 删除学生
function deleteStudent(studentName) {
    if (!confirm(`确定要删除学生"${studentName}"吗？`)) {
        return;
    }
    
    const students = getStudents().filter(s => s !== studentName);
    saveStudents(students);
    
    if (currentStudent === studentName) {
        currentStudent = students.length > 0 ? students[0] : '';
    }
    
    renderStudentSelector();
    alert('学生已删除');
}

// 课程表单处理
document.getElementById('courseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const studentName = document.getElementById('studentName').value;
    const courseName = document.getElementById('courseName').value;
    const totalHours = document.getElementById('totalHours').value ? parseInt(document.getElementById('totalHours').value) : Infinity;
    const paymentId = document.getElementById('paymentId').value;
    const location = document.getElementById('classLocation').value;
    const startDate = document.getElementById('startDate').value || getToday();
    const endDate = document.getElementById('endDate').value;
    
    const checkboxes = document.querySelectorAll('#weekdayCheckboxes input:checked');
    const weekdays = Array.from(checkboxes).map(input => input.value);
    
    if (!studentName || !courseName) {
        alert('请填写学生姓名和课程名称');
        return;
    }
    
    // 上课时间为选填，没有选择则schedule为空对象
    let schedule = {};
    if (weekdays.length > 0) {
        schedule = getWeekdayTimeData('weekdayTimePanel', weekdays);
    }
    
    // 支持关联多个缴费记录
    const paymentIds = paymentId ? paymentId.split(',').filter(id => id.trim()) : [];
    
    const course = {
        id: generateId(),
        studentName,
        courseName,
        totalHours,
        usedHours: 0,
        paymentId: paymentIds.length > 0 ? paymentIds.join(',') : '',
        schedule,
        location,
        startDate,
        endDate,
        status: 'active'
    };
    
    const courses = getCourses();
    courses.push(course);
    saveCourses(courses);
    
    resetForm();
    renderAllSchedule();
    renderStudentCourses();
    
    alert('课程添加成功');
});

function resetForm() {
    document.getElementById('courseForm').reset();
    document.getElementById('weekdayTimePanel').innerHTML = '<div class="empty-state"><p>请先选择上课星期</p></div>';
    document.getElementById('endDate').value = '';
}

// 课程编辑
function editCourse(courseId) {
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    document.getElementById('editCourseModal').style.display = 'flex';
    document.getElementById('editCourseId').value = course.id;
    document.getElementById('editCourseName').value = course.courseName;
    document.getElementById('editTotalHours').value = course.totalHours === Infinity ? '' : course.totalHours;
    document.getElementById('editStudentName').value = course.studentName || '';
    document.getElementById('editClassLocation').value = course.location || '';
    document.getElementById('editStartDate').value = course.startDate;
    document.getElementById('editEndDate').value = course.endDate || '';

    // 显示提示：如果课程已有实际历史记录，提醒用户历史数据不会被改写
    try {
        const warningEl = document.getElementById('editCourseWarning');
        const hasHistory = courseHasHistoricalRecords(course);
        if (warningEl) {
            warningEl.style.display = hasHistory ? 'block' : 'none';
        }
    } catch (e) {}

    // 设置星期复选框
    const checkboxes = document.querySelectorAll('#editWeekdayCheckboxes input');
    const courseWeekdays = Object.keys(course.schedule);
    checkboxes.forEach(cb => {
        cb.checked = courseWeekdays.includes(cb.value);
    });

    renderWeekdayTimePanel('editWeekdayCheckboxes', 'editWeekdayTimePanel', course.schedule);

    // 初始化关联缴费记录多选框
    const preSelectedIds = course.paymentId ? course.paymentId.split(',').filter(id => id.trim()) : [];
    initEditPaymentSelect(preSelectedIds);
}

function closeEditCourseModal() {
    document.getElementById('editCourseModal').style.display = 'none';
}

function updateCourse() {
    const courseId = document.getElementById('editCourseId').value;
    const courses = getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    
    if (courseIndex === -1) return;
    
    const course = courses[courseIndex];
    const courseName = document.getElementById('editCourseName').value;
    const totalHours = document.getElementById('editTotalHours').value ? parseInt(document.getElementById('editTotalHours').value) : Infinity;
    const location = document.getElementById('editClassLocation').value;
    const startDate = document.getElementById('editStartDate').value;
    const endDate = document.getElementById('editEndDate').value;
    const editPaymentId = document.getElementById('editPaymentId').value;
    const editPaymentIds = editPaymentId ? editPaymentId.split(',').filter(id => id.trim()) : [];
    
    // 获取今天的日期字符串
    const todayStr = getToday();
    
    const checkboxes = document.querySelectorAll('#editWeekdayCheckboxes input:checked');
    const weekdays = Array.from(checkboxes).map(input => input.value);
    
    if (!courseName || !startDate) {
        alert('请填写完整信息');
        return;
    }
    
    if (weekdays.length === 0) {
        alert('请选择至少一个上课星期');
        return;
    }
    
    // 验证总课时不能小于已上课时
    const usedHours = course.usedHours || 0;
    if (totalHours !== Infinity && totalHours < usedHours) {
        alert(`总课时不能小于已用课时（已用 ${usedHours} 课时）`);
        return;
    }
    
    const schedule = getWeekdayTimeData('editWeekdayTimePanel', weekdays);
    
    const hasHistory = courseHasHistoricalRecords(course);

    if (hasHistory) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDate(yesterday);

        // 保留历史数据，不修改原课程的开始/结束信息，只设置 splitDate 表示从今天起不再生效
        courses[courseIndex] = {
            ...course,
            splitDate: yesterdayStr,
            status: 'ended'
        };

        // 计算新课程的开始日期：从今天之后的第一个上课日开始
        const today = new Date();
        let scheduleDays = [];
        
        // 处理 schedule 可能是对象或数组的情况
        if (Array.isArray(schedule)) {
            scheduleDays = schedule.filter(s => s && s.day !== undefined).map(s => parseInt(s.day));
        } else if (schedule && typeof schedule === 'object') {
            // 如果是对象，提取所有 day 属性
            Object.keys(schedule).forEach(key => {
                const day = parseInt(key);
                if (!isNaN(day)) {
                    scheduleDays.push(day);
                }
            });
        }
        
        // 如果没有找到上课日，使用原课程的上课日
        if (scheduleDays.length === 0 && course.schedule) {
            if (Array.isArray(course.schedule)) {
                scheduleDays = course.schedule.filter(s => s && s.day !== undefined).map(s => parseInt(s.day));
            } else if (course.schedule && typeof course.schedule === 'object') {
                Object.keys(course.schedule).forEach(key => {
                    const day = parseInt(key);
                    if (!isNaN(day)) {
                        scheduleDays.push(day);
                    }
                });
            }
        }
        
        // 找到今天之后的第一个上课日
        let nextClassDay = null;
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dayOfWeek = checkDate.getDay(); // 0=周日, 1=周一, ..., 6=周六
            if (i > 0 && scheduleDays.includes(dayOfWeek)) {
                nextClassDay = checkDate;
                break;
            }
        }
        
        // 如果没有找到（不应该发生），使用今天作为默认值
        const newStartDate = nextClassDay ? formatDate(nextClassDay) : todayStr;

        const newCourse = {
            id: generateId(),
            studentName: course.studentName,
            courseName,
            totalHours,
            usedHours: 0,
            paymentId: editPaymentIds.length > 0 ? editPaymentIds.join(',') : '',
            schedule,
            location,
            startDate: newStartDate,
            endDate,
            status: 'active',
            originCourseId: course.id
        };

        if (totalHours !== Infinity && totalHours === 0) {
            newCourse.status = 'ended';
        }

        courses.push(newCourse);
        saveCourses(courses);
        closeEditCourseModal();
        renderAllSchedule();
        renderStudentCourses();
        alert('历史数据已保留，新的课程记录将从下次上课日起生效。');
        return;
    }

    const updatedCourse = {
        ...course,
        courseName,
        totalHours,
        location,
        startDate,
        endDate,
        paymentId: editPaymentIds.length > 0 ? editPaymentIds.join(',') : '',
        schedule
    };
    
    // 当总课时等于已上课时，自动结束课程
    if (totalHours !== Infinity && totalHours === usedHours) {
        updatedCourse.status = 'ended';
    }
    
    courses[courseIndex] = updatedCourse;
    saveCourses(courses);
    closeEditCourseModal();
    renderAllSchedule();
    renderStudentCourses();
    
    if (totalHours !== Infinity && totalHours === usedHours) {
        alert('课程已自动结束（总课时等于已用课时）');
    } else {
        alert('课程已更新');
    }
}

function deleteCourse(courseId) {
    // 如果没有传入 courseId，则从表单获取
    if (!courseId) {
        courseId = document.getElementById('editCourseId').value;
    }
    
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    // 检查是否已使用过课时
    if (course && (course.usedHours || 0) > 0) {
        alert('该课程已使用过课时，不允许删除！');
        return;
    }
    
    if (!confirm('确定要删除这门课程吗？')) {
        return;
    }
    
    if (course && course.paymentId) {
        const payments = getPayments();
        reverseFromLinkedPayments(course, payments, course.usedHours || 0);
        savePayments(payments);
    }
    
    const newCourses = courses.filter(c => c.id !== courseId);
    saveCourses(newCourses);
    
    closeEditCourseModal();
    renderAllSchedule();
    renderStudentCourses();
    
    alert('课程已删除');
}

// 结束课程相关函数
function showEndCourseModal(courseId) {
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    document.getElementById('endCourseId').value = course.id;
    document.getElementById('endCourseName').value = course.courseName;
    document.getElementById('endCourseStudent').value = course.studentName;
    document.getElementById('endCourseTotalHours').value = course.totalHours === Infinity ? '无限' : course.totalHours;
    document.getElementById('endCourseUsedHours').value = course.usedHours || 0;
    
    document.getElementById('endCourseModal').style.display = 'flex';
}

function closeEndCourseModal() {
    document.getElementById('endCourseModal').style.display = 'none';
}

function endCourse() {
    const courseId = document.getElementById('endCourseId').value;
    const courses = getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    
    if (courseIndex === -1) return;
    
    courses[courseIndex].status = 'ended';
    // 设置结束日期为今天，这样课表就不会显示该课程未来的上课时间
    courses[courseIndex].endDate = new Date().toISOString().split('T')[0];
    saveCourses(courses);
    
    closeEndCourseModal();
    renderAllSchedule();
    renderStudentCourses();
    
    alert('课程已结束');
}

// 恢复课程（重新激活已结束的课程）
function reactivateCourse(courseId) {
    const courses = getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    
    if (courseIndex === -1) return;
    
    courses[courseIndex].status = 'active';
    // 清除之前设置的结束日期，让课程恢复正常
    delete courses[courseIndex].splitDate;
    
    saveCourses(courses);
    renderAllSchedule();
    renderStudentCourses();
    
    alert('课程已恢复为使用中状态');
}

// 渲染全员总课表
function resetSchedule() {
    // 设置学生筛选为全部学生
    document.getElementById('scheduleStudentFilter').value = '';
    
    // 设置日期为今天所在的这一周
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=周日, 1=周一, ..., 6=周六
    
    // 计算周一的日期
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    // 计算周日的日期
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // 设置日期格式为 YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    document.getElementById('scheduleStartDate').value = formatDate(monday);
    document.getElementById('scheduleEndDate').value = formatDate(sunday);
    
    // 重新渲染课表
    renderAllSchedule();
}

function renderAllSchedule() {
    const filterStudent = document.getElementById('scheduleStudentFilter').value;
    const scheduleStartDate = document.getElementById('scheduleStartDate').value;
    const scheduleEndDate = document.getElementById('scheduleEndDate').value;
    let courses = getCourses();
    
    // 去重：按课程ID去重，避免重复渲染
    const seen = new Set();
    courses = courses.filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
    });
    
    if (filterStudent) {
        courses = courses.filter(c => c.studentName === filterStudent);
    }
    
    if (scheduleStartDate || scheduleEndDate) {
        courses = courses.filter(course => {
            // 标准化日期格式（支持 2026-05-01 和 2026/05/01）
            const normalizeDate = (d) => d ? d.replace(/\//g, '-') : '';
            const courseStart = normalizeDate(course.startDate);
            
            // 使用中状态的课程，结束日期默认为无限远（2999-12-31）
            // 只有已结束的课程才使用实际的结束日期
            let courseEnd;
            if (course.status === 'ended') {
                courseEnd = normalizeDate(getCourseEffectiveEndDate(course)) || '2999-12-31';
            } else {
                courseEnd = normalizeDate(course.endDate) || '2999-12-31';
            }
            
            const filterStart = normalizeDate(scheduleStartDate);
            const filterEnd = normalizeDate(scheduleEndDate);
            
            let isValid = true;
            if (filterStart && courseEnd < filterStart) {
                isValid = false;
            }
            if (filterEnd && courseStart > filterEnd) {
                isValid = false;
            }
            return isValid;
        });
    }
    
    const table = document.getElementById('allScheduleTable');
    const tbody = table.querySelector('tbody');
    
    // 生成时间槽（每30分钟一个槽）
    const timeSlots = generateTimeSlots();
    
    // 先找出每个时间段每个星期几有多少个重叠课程
    const maxOverlap = [];
    for (let i = 0; i < timeSlots.length; i++) {
        maxOverlap[i] = [];
        for (let day = 0; day < 7; day++) {
            maxOverlap[i][day] = 1;
        }
    }
    
    // 计算每个单元格的最大重叠课程数
    const overlapChecked = new Set(); // 用于去重
    courses.forEach(course => {
        for (let day = 0; day < 7; day++) {
            const daySchedule = getDaySchedule(course, day);
            if (!daySchedule) continue;
            
            // 去重：同一课程同一天只计算一次
            const key = `${course.id}-${day}`;
            if (overlapChecked.has(key)) continue;
            overlapChecked.add(key);
            
            const courseStart = daySchedule.startTime;
            const courseEnd = daySchedule.endTime;
            
            timeSlots.forEach((slot, slotIndex) => {
                const [slotStart, slotEnd] = slot.split('-');
                if (isTimeOverlap(slotStart, slotEnd, courseStart, courseEnd)) {
                    maxOverlap[slotIndex][day]++;
                }
            });
        }
    });
    
    // 找出所有时间段中最大的重叠数
    let globalMaxOverlap = 1;
    maxOverlap.forEach(row => {
        row.forEach(count => {
            if (count > globalMaxOverlap) {
                globalMaxOverlap = count;
            }
        });
    });
    
    // 构建单元格数据：存储每个单元格的课程列表
    const cellData = [];
    for (let i = 0; i < timeSlots.length; i++) {
        cellData[i] = [];
        for (let day = 0; day < 7; day++) {
            cellData[i][day] = { courses: [], occupied: false, maxRowSpan: 1 };
        }
    }
    
    // 收集所有课程片段（按天分组）
    const dayCourses = [];
    const addedCourses = new Set(); // 用于去重
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 0; day < 7; day++) {
        dayCourses[day] = [];
        courses.forEach(course => {
            const daySchedule = getDaySchedule(course, day);
            if (!daySchedule) return;
            
            // 计算当前周某天的日期
            const weekStart = scheduleStartDate ? new Date(scheduleStartDate) : new Date();
            const todayOfWeek = new Date(weekStart);
            todayOfWeek.setDate(weekStart.getDate() + day);
            todayOfWeek.setHours(0, 0, 0, 0);
            
            // 检查课程是否应该在当前周的某天显示（考虑 splitDate）
            if (course.splitDate) {
                // 对于有 splitDate 的已结束课程，只显示到 splitDate（包含 splitDate 当天）
                const splitDate = new Date(course.splitDate);
                splitDate.setHours(0, 0, 0, 0);
                if (todayOfWeek > splitDate) {
                    return; // 旧课程在 splitDate 之后不显示
                }
            } else if (course.status === 'ended') {
                // 没有 splitDate 的已结束课程
                // 已经发生过的课程（todayOfWeek <= today）应该显示
                // 只有还没发生的课程（todayOfWeek > today）且课程已结束，才不显示
                if (todayOfWeek > today) {
                    return; // 课程已结束且还未发生，不显示
                }
            }
            
            // 去重：同一课程同一天只添加一次
            const key = `${course.id}-${day}`;
            if (addedCourses.has(key)) return;
            addedCourses.add(key);
            
            const courseStart = daySchedule.startTime;
            const courseEnd = daySchedule.endTime;
            
            // 找到课程开始和结束的时间槽索引
            let startSlotIndex = -1;
            let endSlotIndex = -1;
            
            timeSlots.forEach((slot, index) => {
                const [slotStart, slotEnd] = slot.split('-');
                const ss = normalizeTime(slotStart);
                const se = normalizeTime(slotEnd);
                const cs = normalizeTime(courseStart);
                const ce = normalizeTime(courseEnd);
                if (cs >= ss && cs < se) {
                    startSlotIndex = index;
                }
                if (ce > ss && ce <= se) {
                    endSlotIndex = index;
                }
            });
            
            if (startSlotIndex >= 0 && endSlotIndex >= 0) {
                dayCourses[day].push({
                    course,
                    daySchedule,
                    startSlotIndex,
                    endSlotIndex,
                    rowSpan: endSlotIndex - startSlotIndex + 1
                });
            }
        });
    }
    
    // 将时间重叠的课程分组到同一个起始单元格
    for (let day = 0; day < 7; day++) {
        // 按开始时间槽排序
        dayCourses[day].sort((a, b) => a.startSlotIndex - b.startSlotIndex);
        
        const n = dayCourses[day].length;
        if (n === 0) continue;
        
        // 使用并查集确保所有间接重叠的课程分到同一组
        const parent = Array.from({length: n}, (_, i) => i);
        function find(i) {
            if (parent[i] !== i) parent[i] = find(parent[i]);
            return parent[i];
        }
        function union(i, j) {
            parent[find(i)] = find(j);
        }
        
        // 找出所有重叠的课程对
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const a = dayCourses[day][i];
                const b = dayCourses[day][j];
                if (isTimeOverlap(a.daySchedule.startTime, a.daySchedule.endTime, b.daySchedule.startTime, b.daySchedule.endTime)) {
                    union(i, j);
                }
            }
        }
        
        // 构建组
        const groupMap = new Map();
        for (let i = 0; i < n; i++) {
            const root = find(i);
            if (!groupMap.has(root)) groupMap.set(root, []);
            groupMap.get(root).push(dayCourses[day][i]);
        }
        
        // 将分组后的课程放入cellData
        groupMap.forEach(group => {
            const minStartSlot = Math.min(...group.map(g => g.startSlotIndex));
            const maxEndSlot = Math.max(...group.map(g => g.endSlotIndex));
            const groupRowSpan = maxEndSlot - minStartSlot + 1;
            
            const lanes = [];
            group.sort((a, b) => a.startSlotIndex - b.startSlotIndex || a.endSlotIndex - b.endSlotIndex);
            group.forEach(dc => {
                let assignedLane = lanes.findIndex(lane => lane.student === dc.course.studentName && lane.endSlotIndex < dc.startSlotIndex);
                if (assignedLane === -1) {
                    assignedLane = lanes.findIndex(lane => lane.endSlotIndex < dc.startSlotIndex);
                }
                if (assignedLane === -1) {
                    assignedLane = lanes.length;
                    lanes.push({ endSlotIndex: -1, student: '' });
                }
                lanes[assignedLane] = { endSlotIndex: dc.endSlotIndex, student: dc.course.studentName };

                cellData[minStartSlot][day].courses.push({
                    course: dc.course,
                    daySchedule: dc.daySchedule,
                    rowSpan: groupRowSpan,
                    originalStartSlot: dc.startSlotIndex,
                    lane: assignedLane
                });
            });
            
            const laneCount = lanes.length;
            if (groupRowSpan > cellData[minStartSlot][day].maxRowSpan) {
                cellData[minStartSlot][day].maxRowSpan = groupRowSpan;
            }
            cellData[minStartSlot][day].laneCount = Math.max(cellData[minStartSlot][day].laneCount || 1, laneCount);
            
            // 标记该组覆盖的所有单元格为已占用
            for (let i = minStartSlot + 1; i <= maxEndSlot; i++) {
                cellData[i][day].occupied = true;
            }
        });
    }
    
    // 生成表格HTML
    let html = '';
    
    timeSlots.forEach((slot, slotIndex) => {
        const [slotStart] = slot.split('-');
        
        html += `<tr><td class="time-slot">${slotStart}</td>`;
        
        for (let day = 0; day < 7; day++) {
            const cell = cellData[slotIndex][day];
            
            if (cell.occupied && cell.courses.length === 0) {
                // 被合并的空单元格，不输出
                continue;
            } else if (cell.courses.length === 0) {
                // 空单元格
                html += `<td></td>`;
            } else {
                // 有课程的单元格
                const maxRowSpan = cell.maxRowSpan;
                
                if (cell.courses.length === 1) {
                    // 只有一个课程
                    const c = cell.courses[0];
                    const time = `${c.daySchedule.startTime}-${c.daySchedule.endTime}`;
                    const bgColor = getStudentColor(c.course.studentName);
                    // 根据实际时长计算高度（每分钟1px，与时间槽60px/小时对应）
                    const duration = getDurationMinutes(c.daySchedule.startTime, c.daySchedule.endTime);
                    const height = Math.max(56, duration * 1.0);
                    // 计算顶部偏移（相对于时间槽开始时间）
                    const slotStartTime = slotStart;
                    const offset = getDurationMinutes(slotStartTime, c.daySchedule.startTime);
                    const marginTop = offset * 1.0;
                    html += `<td rowspan="${c.rowSpan}" style="vertical-align: top;"><div class="class-cell" onclick="editCourse('${c.course.id}')" style="background:${bgColor}; height:${height}px; margin-top:${marginTop}px;">${c.course.courseName}<br>${c.course.studentName}<br>${time}<br>${c.course.location}</div></td>`;
                } else {
                    // 多个课程重叠，按分配车道渲染
                    const laneCount = cell.laneCount || Math.max(...cell.courses.map(c => c.lane || 0)) + 1;
                    const totalHeight = maxRowSpan * 30;
                    let cellContent = `<div class="class-cell-multi" style="height:${totalHeight}px;">`;
                    cell.courses.forEach(c => {
                        const time = `${c.daySchedule.startTime}-${c.daySchedule.endTime}`;
                        const bgColor = getStudentColor(c.course.studentName);
                        const duration = getDurationMinutes(c.daySchedule.startTime, c.daySchedule.endTime);
                        const height = Math.max(56, duration * 1.0);
                        const slotStartTime = slotStart;
                        const offset = getDurationMinutes(slotStartTime, c.daySchedule.startTime);
                        const top = offset * 1.0;
                        const baseWidth = 100 / laneCount;
                        const width = baseWidth > 8 ? `calc(${baseWidth}% - 2px)` : `${baseWidth}%`;
                        const left = `calc(${(c.lane || 0) * baseWidth}% + 1px)`;
                        cellContent += `<div class="class-cell-item" onclick="editCourse('${c.course.id}')" style="background:${bgColor}; height:${height}px; top:${top}px; left:${left}; width:${width};">${c.course.courseName}<br>${c.course.studentName}<br>${time}<br>${c.course.location}</div>`;
                    });
                    cellContent += '</div>';
                    html += `<td rowspan="${maxRowSpan}" style="vertical-align: top;">${cellContent}</td>`;
                }
            }
        }
        
        html += `</tr>`;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="8" class="empty-state">暂无课程安排</td></tr>';
}

// 渲染学生课程详情
function renderStudentCourses() {
    const filterStudent = document.getElementById('detailStudentFilter')?.value || '';
    const filterCourse = document.getElementById('detailCourseFilter')?.value || '';
    const filterDay = document.getElementById('detailDayFilter')?.value || '';
    const detailStartDate = document.getElementById('detailStartDate')?.value || '';
    const detailEndDate = document.getElementById('detailEndDate')?.value || '';
    const filterStatus = document.getElementById('detailStatusFilter')?.value || '';
    
    let courses = getCourses();
    const payments = getPayments();
    
    if (filterStudent) {
        courses = courses.filter(c => c.studentName === filterStudent);
    }
    
    if (filterCourse) {
        courses = courses.filter(c => c.courseName === filterCourse);
    }
    
    // 周几筛选：如果课程在该周几有上课安排，就筛选出来
    if (filterDay) {
        // HTML中选项值是 1=周一, 2=周二, ..., 0=周日
        // 但内部索引是 0=周一, 1=周二, ..., 6=周日
        let dayNum = parseInt(filterDay);
        if (dayNum === 0) {
            dayNum = 6; // 周日 -> 索引6
        } else {
            dayNum = dayNum - 1; // 周一(1)->0, 周二(2)->1, ..., 周六(6)->5
        }
        
        courses = courses.filter(course => {
            const schedule = course.schedule;
            if (!schedule) return false;
            
            // 检查schedule是否包含该周几的安排
            if (Array.isArray(schedule)) {
                return schedule.some(s => s && parseInt(s.day) === dayNum);
            } else if (typeof schedule === 'object') {
                // schedule是对象格式，key是周几索引(0-6)或中文星期名称
                if (schedule[dayNum] !== undefined) return true;
                // 也检查中文星期名称
                const weekdayName = WEEKDAY_NAMES[dayNum];
                return schedule[weekdayName] !== undefined;
            }
            return false;
        });
    }
    
    if (filterStatus) {
        courses = courses.filter(c => c.status === filterStatus);
    }
    
    if (detailStartDate || detailEndDate) {
        courses = courses.filter(course => {
            const courseStart = course.startDate;
            const courseEnd = getCourseEffectiveEndDate(course);
            
            let isValid = true;
            if (detailStartDate && courseEnd < detailStartDate) {
                isValid = false;
            }
            if (detailEndDate && courseStart > detailEndDate) {
                isValid = false;
            }
            return isValid;
        });
    }
    
    // 按学生名称 → 机构名称 → 课程名称排序
    courses.sort((a, b) => {
        if (a.studentName !== b.studentName) {
            return a.studentName.localeCompare(b.studentName);
        }
        if ((a.institution || '') !== (b.institution || '')) {
            return (a.institution || '').localeCompare(b.institution || '');
        }
        return a.courseName.localeCompare(b.courseName);
    });
    
    const container = document.getElementById('studentCourseDetail');
    
    if (courses.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无课程记录</p></div>';
        return;
    }
    
    let html = '';
    
    courses.forEach(course => {
        const remainingHours = course.totalHours === Infinity ? '无限' : (course.totalHours - (course.usedHours || 0));
        const usedHours = course.usedHours || 0;
        const totalHours = course.totalHours === Infinity ? '无限' : course.totalHours;
        
        let scheduleHtml = '';
        Object.entries(course.schedule).forEach(([day, time]) => {
            scheduleHtml += `<div class="schedule-item"><span>${WEEKDAY_NAMES[parseInt(day)]}</span><span>${time.startTime}-${time.endTime}</span></div>`;
        });
        
        // 只显示还有剩余课时的关联缴费记录
        const paymentIds = course.paymentId ? course.paymentId.split(',').map(id => id.trim()).filter(Boolean) : [];
        const linkedPayments = paymentIds.map(id => payments.find(p => p.id === id)).filter(Boolean);
        const activePayments = linkedPayments.filter(p => (p.totalHours - p.usedHours) > 0);
        
        let paymentHtml = '';
        if (activePayments.length > 0) {
            const paymentItems = activePayments.map(p => 
                `${p.date} ${p.organization} ¥${p.amount}（剩余${p.totalHours - p.usedHours}课时）`
            ).join('<br>');
            paymentHtml = `<div class="course-card-payment">关联缴费：<br>${paymentItems}</div>`;
        }
        
        html += `
            <div class="course-card">
                <div class="course-card-header">
                    <div class="course-card-title">${course.courseName}</div>
                    <div class="course-card-status active">${course.status === 'active' ? '进行中' : '已结束'}</div>
                </div>
                <div class="course-card-body">
                    <div>👤 ${course.studentName}</div>
                    <div>📍 ${course.location || '-'}</div>
                    <div>📅 ${course.startDate} 至 ${course.endDate || '长期'}</div>
                    <div>⏱️ 已用 ${usedHours} / ${totalHours} 课时</div>
                </div>
                <div class="course-card-schedule">
                    <div style="font-weight:500;margin-bottom:8px;">上课时间：</div>
                    ${scheduleHtml}
                </div>
                ${paymentHtml}
                <div class="course-card-actions">
                    <button class="btn btn-secondary" onclick="editCourse('${course.id}')">编辑</button>
                    ${course.status === 'active' ? `<button class="btn btn-danger" style="background:#dc3545;color:white" onclick="showEndCourseModal('${course.id}')">结束</button>` : ''}
                    ${course.status === 'ended' ? `<button class="btn btn-success" style="background:#28a745;color:white" onclick="reactivateCourse('${course.id}')">恢复</button>` : ''}
                    ${course.status === 'ended' && (course.usedHours || 0) === 0 ? `<button class="btn btn-danger" style="background:#dc3545;color:white" onclick="deleteCourse('${course.id}')">删除</button>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 更新课程筛选下拉框选项（与学生联动）
function updateCourseFilterOptions() {
    const studentSelect = document.getElementById('detailStudentFilter');
    const courseSelect = document.getElementById('detailCourseFilter');
    const selectedCourse = courseSelect.value;
    
    const selectedStudent = studentSelect.value;
    const courses = getCourses();
    
    // 根据选中的学生过滤课程
    let filteredCourses = courses;
    if (selectedStudent) {
        filteredCourses = courses.filter(c => c.studentName === selectedStudent);
    }
    
    // 获取不重复的课程名称
    const courseNames = [...new Set(filteredCourses.map(c => c.courseName))].sort();
    
    // 更新课程下拉框
    courseSelect.innerHTML = '<option value="">全部课程</option>';
    courseNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        // 如果之前选中了某个课程，保持选中状态
        if (name === selectedCourse) {
            option.selected = true;
        }
        courseSelect.appendChild(option);
    });
}

// 更新学生筛选下拉框选项（与课程联动）
function updateStudentFilterOptions() {
    const studentSelect = document.getElementById('detailStudentFilter');
    const courseSelect = document.getElementById('detailCourseFilter');
    const selectedStudent = studentSelect.value;
    
    const selectedCourse = courseSelect.value;
    const courses = getCourses();
    
    // 根据选中的课程过滤学生
    let filteredCourses = courses;
    if (selectedCourse) {
        filteredCourses = courses.filter(c => c.courseName === selectedCourse);
    }
    
    // 获取不重复的学生名称
    const studentNames = [...new Set(filteredCourses.map(c => c.studentName))].sort();
    
    // 更新学生下拉框
    studentSelect.innerHTML = '<option value="">全部学生</option>';
    studentNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        // 如果之前选中了某个学生，保持选中状态
        if (name === selectedStudent) {
            option.selected = true;
        }
        studentSelect.appendChild(option);
    });
}

// 清空“学生课程详情”筛选条件并刷新
function resetDetailFilters() {
    const studentSelect = document.getElementById('detailStudentFilter');
    const courseSelect = document.getElementById('detailCourseFilter');
    const daySelect = document.getElementById('detailDayFilter');
    const startInput = document.getElementById('detailStartDate');
    const endInput = document.getElementById('detailEndDate');
    const statusSelect = document.getElementById('detailStatusFilter');

    if (studentSelect) studentSelect.value = '';
    // 重置课程筛选并重新加载选项
    updateCourseFilterOptions();
    if (courseSelect) courseSelect.value = '';
    // 重置周几筛选
    if (daySelect) daySelect.value = '';
    // 日期默认：以今天为中心的前后一年
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const oneYearLater = new Date(today);
    oneYearLater.setFullYear(today.getFullYear() + 1);
    if (startInput) startInput.value = formatDate(oneYearAgo);
    if (endInput) endInput.value = formatDate(oneYearLater);
    if (statusSelect) statusSelect.value = 'active';

    renderStudentCourses();
}

// 渲染课时统计
function resetStatsFilters() {
    document.getElementById('statsStudentFilter').value = '';
    document.getElementById('statsOrgFilter').value = '';
    document.getElementById('statsCourseFilter').value = '';
    document.getElementById('statsPeriodFilter').value = '';
    
    // 设置默认日期：一年前到一年后
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    const formattedOneYearAgo = oneYearAgo.toISOString().split('T')[0];
    const formattedOneYearLater = oneYearLater.toISOString().split('T')[0];
    
    const statsStartDateInput = document.getElementById('statsStartDate');
    const statsEndDateInput = document.getElementById('statsEndDate');
    if (statsStartDateInput) statsStartDateInput.value = formattedOneYearAgo;
    if (statsEndDateInput) statsEndDateInput.value = formattedOneYearLater;
    
    renderStats();
}

function renderStats() {
    const filterStudent = document.getElementById('statsStudentFilter')?.value || '';
    const filterOrg = document.getElementById('statsOrgFilter')?.value || '';
    const filterCourse = document.getElementById('statsCourseFilter')?.value || '';
    const filterPeriod = document.getElementById('statsPeriodFilter')?.value || '';
    const startDate = document.getElementById('statsStartDate')?.value || '';
    const endDate = document.getElementById('statsEndDate')?.value || '';
    
    const today = getToday();
    const courses = getCourses();
    const payments = getPayments();
    const attendance = getAttendance();
    
    let filteredCourses = courses;
    let filteredPayments = payments;
    
    if (filterStudent) {
        filteredCourses = filteredCourses.filter(c => c.studentName === filterStudent);
        
        const studentCourses = filteredCourses.map(c => c.id);
        filteredPayments = filteredPayments.filter(p => {
            return filteredCourses.some(c => c.paymentId === p.id);
        });
    }
    
    if (filterOrg) {
        filteredPayments = filteredPayments.filter(p => p.organization === filterOrg);
        const orgPayments = filteredPayments.map(p => p.id);
        filteredCourses = filteredCourses.filter(c => orgPayments.includes(c.paymentId));
    }
    
    if (filterCourse) {
        filteredCourses = filteredCourses.filter(c => c.courseName === filterCourse);
        const coursePayments = filteredCourses.map(c => c.paymentId);
        filteredPayments = filteredPayments.filter(p => coursePayments.includes(p.id));
    }
    
    // 时段筛选：上午(0:00-12:00)、下午(12:00-18:00)、晚上(18:00-24:00)
    if (filterPeriod) {
        filteredCourses = filteredCourses.filter(course => {
            const schedule = course.schedule;
            if (!schedule) return false;
            
            // 获取课程的开始时间
            let startTime = null;
            
            if (Array.isArray(schedule)) {
                for (const s of schedule) {
                    if (s && s.startTime) {
                        startTime = s.startTime;
                        break;
                    }
                }
            } else if (typeof schedule === 'object') {
                for (const key of Object.keys(schedule)) {
                    const s = schedule[key];
                    if (s && s.startTime) {
                        startTime = s.startTime;
                        break;
                    }
                }
            }
            
            if (!startTime) return false;
            
            const timeParts = startTime.split(':');
            const hour = parseInt(timeParts[0]);
            
            switch (filterPeriod) {
                case 'morning': // 上午(0:00-12:00)
                    return hour >= 0 && hour < 12;
                case 'afternoon': // 下午(12:00-18:00)
                    return hour >= 12 && hour < 18;
                case 'evening': // 晚上(18:00-24:00)
                    return hour >= 18 && hour < 24;
                default:
                    return true;
            }
        });
        
        const periodCourses = filteredCourses.map(c => c.paymentId);
        filteredPayments = filteredPayments.filter(p => periodCourses.includes(p.id));
    }
    
    if (startDate || endDate) {
        filteredCourses = filteredCourses.filter(course => {
            const courseStart = course.startDate;
            const courseEnd = getCourseEffectiveEndDate(course);
            
            let isValid = true;
            if (startDate && courseEnd < startDate) {
                isValid = false;
            }
            if (endDate && courseStart > endDate) {
                isValid = false;
            }
            return isValid;
        });
        
        // 对缴费记录也应用日期过滤
        if (startDate) {
            filteredPayments = filteredPayments.filter(p => p.date >= startDate);
        }
        if (endDate) {
            filteredPayments = filteredPayments.filter(p => p.date <= endDate);
        }
    }
    
    // 计算已消耗课时（包括签到记录和扣课时的请假记录）
    let totalUsedHours = 0;
    let totalRemainingHours = 0;
    let totalMissedHours = 0;
    let totalPaidAmount = 0;
    let totalConsumedAmount = 0;
    
    // 根据签到记录和扣课时请假记录计算实际已消耗课时
    const filteredCourseIds = filteredCourses.map(c => c.id);
    let filteredAttendance = attendance.filter(a => filteredCourseIds.includes(a.courseId));
    
    // 获取扣课时的请假记录
    const leaveRecords = getLeaveRecords();
    let filteredLeaveRecords = leaveRecords.filter(l => 
        filteredCourseIds.includes(l.courseId) && l.deductHours
    );
    
    // 获取所有请假记录（包括扣课时和不扣课时）
    let filteredMissedLeaveRecords = leaveRecords.filter(l => 
        filteredCourseIds.includes(l.courseId)
    );
    
    // 应用日期筛选（与明细保持一致）
    if (startDate) {
        filteredAttendance = filteredAttendance.filter(a => a.date >= startDate);
        filteredLeaveRecords = filteredLeaveRecords.filter(l => l.date >= startDate);
        filteredMissedLeaveRecords = filteredMissedLeaveRecords.filter(l => l.date >= startDate);
    }
    if (endDate) {
        filteredAttendance = filteredAttendance.filter(a => a.date <= endDate);
        filteredLeaveRecords = filteredLeaveRecords.filter(l => l.date <= endDate);
        filteredMissedLeaveRecords = filteredMissedLeaveRecords.filter(l => l.date <= endDate);
    }
    
    totalMissedHours = filteredMissedLeaveRecords.length;
    
    // 统计每个课程的签到次数和扣课时请假次数
    const courseAttendanceCount = {};
    filteredAttendance.forEach(record => {
        courseAttendanceCount[record.courseId] = (courseAttendanceCount[record.courseId] || 0) + 1;
    });
    
    // 加上扣课时的请假次数
    filteredLeaveRecords.forEach(record => {
        courseAttendanceCount[record.courseId] = (courseAttendanceCount[record.courseId] || 0) + 1;
    });
    
    // 获取已关联课程的缴费记录ID
    const coursePaymentIds = filteredCourses.map(c => c.paymentId);
    
    // 预构建 O(1) 查找结构
    const paymentMap = {};
    payments.forEach(p => { paymentMap[p.id] = p; });
    
    const attSetByCourse = {};
    attendance.forEach(a => {
        if (!attSetByCourse[a.courseId]) attSetByCourse[a.courseId] = new Set();
        attSetByCourse[a.courseId].add(a.date);
    });
    
    const leaveSetByCourse = {};
    leaveRecords.forEach(l => {
        if (!leaveSetByCourse[l.courseId]) leaveSetByCourse[l.courseId] = new Set();
        leaveSetByCourse[l.courseId].add(l.date);
    });
    
    const coursePaymentIdSet = new Set(coursePaymentIds);
    
    // 计算剩余课时的日期边界（受筛选条件影响）
    const remainingStart = startDate && startDate > today ? startDate : today;
    const remainingEnd = endDate || '';
    
    filteredCourses.forEach(course => {
        // 使用日期范围内的实际已用课时（与明细保持一致）
        const actualUsedHours = (courseAttendanceCount[course.id] || 0);
        totalUsedHours += actualUsedHours;
        
        // 统计剩余课时（与明细一致：未来未签到、未请假的课程数量）
        if (course.status !== 'active') return;
        
        const payment = paymentMap[course.paymentId];
        if (!payment) return;
        
        const remainingHours = (payment.totalHours || 0) - (payment.usedHours || 0);
        if (remainingHours <= 0) return;
        
        const courseEnd = getCourseEffectiveEndDate(course);
        if (courseEnd < remainingStart) return;
        
        let addedCount = 0;
        const weekdays = Object.keys(course.schedule);
        const attSet = attSetByCourse[course.id] || new Set();
        const lvSet = leaveSetByCourse[course.id] || new Set();
        
        weekdays.forEach(day => {
            let currentDate = new Date(remainingStart);
            const maxEndDate = new Date();
            maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);
            let endTime = Math.min(new Date(courseEnd).getTime(), maxEndDate.getTime());
            if (remainingEnd) {
                endTime = Math.min(endTime, new Date(remainingEnd).getTime());
            }
            const end = new Date(endTime);
            
            const dayIndex = getDayIndex(day);
            if (dayIndex === -1) return;
            
            const targetDayOfWeek = (dayIndex + 1) % 7;
            while (currentDate.getDay() !== targetDayOfWeek) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            while (currentDate <= end && addedCount < remainingHours) {
                const dateStr = formatDate(currentDate);
                
                if (!attSet.has(dateStr) && !lvSet.has(dateStr)) {
                    totalRemainingHours++;
                    addedCount++;
                }
                
                currentDate.setDate(currentDate.getDate() + 7);
            }
        });
    });
    
    filteredPayments.forEach(payment => {
        const originalAmount = payment.originalAmount !== undefined ? payment.originalAmount : payment.amount;
        const originalTotalHours = payment.originalTotalHours !== undefined ? payment.originalTotalHours : payment.totalHours;
        
        // 使用当前金额，而不是原始金额
        totalPaidAmount += payment.amount;
        
        // 如果缴费记录已关联到课程，跳过重复统计
        if (!coursePaymentIdSet.has(payment.id)) {
            // 未关联课程的缴费记录，直接使用记录中的已用课时
            totalUsedHours += payment.usedHours;
        }
        
        // 计算已消费金额 - 只统计已关联课程的缴费记录（与明细表格一致）
        if (originalTotalHours > 0) {
            const relatedCourses = filteredCourses.filter(c => c.paymentId === payment.id);
            
            // 只统计已关联课程的缴费记录
            if (relatedCourses.length > 0) {
                const unitPrice = originalAmount / originalTotalHours;
                let courseTotalUsedHours = 0;
                
                relatedCourses.forEach(course => {
                    // 使用日期范围内的已用课时（与明细保持一致）
                    courseTotalUsedHours += courseAttendanceCount[course.id] || 0;
                });
                
                totalConsumedAmount += courseTotalUsedHours * unitPrice;
            }
        }
    });
    
    const statValues = document.querySelectorAll('#statsGrid .stat-value');
    statValues[0].textContent = totalUsedHours;
    statValues[1].textContent = totalMissedHours;
    statValues[2].textContent = totalRemainingHours;
    statValues[3].textContent = totalConsumedAmount.toFixed(0);
    statValues[4].textContent = totalPaidAmount.toFixed(0);
    
    // 如果明细区域正在显示，同步更新明细表格
    const detailSection = document.getElementById('statsDetailSection');
    if (detailSection && detailSection.style.display === 'block') {
        const type = document.getElementById('statsDetailType').value;
        renderStatsDetail(type);
    }
}

// 渲染今日签到
function renderAttendance() {
    const attendance = getAttendance();
    const courses = getCourses();
    const payments = getPayments();
    const today = getToday();
    const todayDay = new Date().getDay();
    const adjustedDay = todayDay === 0 ? 6 : todayDay - 1;
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const container = document.getElementById('attendanceSection');
    
    // 获取今日请假记录
    const leaveRecords = getLeaveRecords();
    
    // 获取历史未打卡的课程记录（已过期的未签到课程）
    const missedRecords = getMissedAttendance();
    
    let html = '<div class="attendance-list">';
    
    // 先显示历史未打卡记录（已过期的未签到课程）
    if (missedRecords.length > 0) {
        html += '<div class="missed-section"><h4> 历史未打卡</h4>';
        
        missedRecords.forEach(record => {
            const course = courses.find(c => c.id === record.courseId);
            if (!course) return;
            
            const payment = payments.find(p => p.id === course.paymentId);
            const remainingHours = payment ? (payment.totalHours - payment.usedHours) : '无限';
            
            // 检查是否已经请假
            const isLeave = leaveRecords.some(l => l.courseId === record.courseId && l.date === record.date);
            
            html += `
                <div class="attendance-item missed">
                    <div class="course-info">
                        <div class="course-name">${course.courseName}</div>
                        <div class="course-time">${record.date} ${record.schedule.startTime}-${record.schedule.endTime} | ${course.location || '-'} | 剩余${remainingHours}课时</div>
                    </div>
                    <div class="attendance-actions">
                        <button class="attendance-btn ${isLeave ? 'disabled' : 'available'}" 
                            onclick="${isLeave ? '' : `addManualAttendance('${record.courseId}', '${record.date}')`}"
                            ${isLeave ? 'disabled' : ''}>
                            ${isLeave ? '已请假' : '补签'}
                        </button>
                        <button class="leave-btn ${isLeave ? 'cancel-leave' : 'available'}" 
                            onclick="${isLeave ? `cancelLeave('${record.courseId}', '${record.date}')` : `showLeaveModalForMissed('${record.courseId}', '${record.date}')`}">
                            ${isLeave ? '取消请假' : '请假'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // 显示今日课程
    const todayCourses = courses.filter(course => {
        if (course.status !== 'active') return false;
        const daySchedule = getDaySchedule(course, adjustedDay);
        if (!daySchedule) return false;
        
        const courseStart = course.startDate;
        const courseEnd = getCourseEffectiveEndDate(course);
        
        if (courseStart > today || courseEnd < today) return false;
        
        return true;
    });
    
    if (todayCourses.length > 0) {
        html += '<div class="today-section"><h4>🎯 今日课程</h4>';
        
        todayCourses.forEach(course => {
            const schedule = getDaySchedule(course, adjustedDay);
            const isSigned = attendance.some(a => 
                a.courseId === course.id && a.date === today
            );
            const isLeave = leaveRecords.some(l => 
                l.courseId === course.id && l.date === today
            );
            
            const payment = payments.find(p => p.id === course.paymentId);
            const remainingHours = payment ? (payment.totalHours - payment.usedHours) : '无限';
            
            // 判断课程时间状态
            const classEndTime = schedule.endTime;
            const classStartTime = schedule.startTime;
            const isClassOver = currentTime > classEndTime;
            const isClassStarted = currentTime >= classStartTime;
            const isClassNotStarted = currentTime < classStartTime;
            
            // 签到按钮是否可用：课程开始后（包括课程结束后当天）都可用
            const canSignIn = isClassStarted && !isLeave;
            
            html += `
                <div class="attendance-item ${isSigned ? 'signed' : ''} ${isLeave ? 'leave' : ''}">
                    <div class="course-info">
                        <div class="course-name">${course.courseName}</div>
                        <div class="course-time">${schedule.startTime}-${schedule.endTime} | ${course.location || '-'} | 剩余${remainingHours}课时</div>
                        ${isClassNotStarted ? '<div class="class-status">⏳ 未到上课时间</div>' : ''}
                        ${isClassStarted && !isClassOver && !isSigned ? '<div class="class-status classing">🔴 上课中</div>' : ''}
                        ${isClassOver && !isSigned ? '<div class="class-status missed">⚠️ 已过上课时间</div>' : ''}
                    </div>
                    <div class="attendance-actions">
                        <button class="attendance-btn ${isSigned ? 'signed' : (isLeave || !canSignIn ? 'disabled' : 'available')}" 
                            onclick="${isLeave ? '' : (!canSignIn && !isSigned ? '' : (isSigned ? `cancelAttendanceToday('${course.id}')` : `showAttendanceModal('${course.id}', '${adjustedDay}')`))}"
                            ${isLeave || (!canSignIn && !isSigned) ? 'disabled' : ''}>
                            ${isSigned ? '取消签到' : (isLeave ? '已请假' : (isClassNotStarted ? '未到时间' : '签到'))}
                        <button class="leave-btn ${isLeave ? 'cancel-leave' : (isSigned ? 'disabled' : 'available')}" 
                            onclick="${isSigned ? '' : (isLeave ? `cancelLeave('${course.id}', '${today}')` : `showLeaveModal('${course.id}', '${adjustedDay}')`)}">
                            ${isLeave ? '取消请假' : '请假'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    if (missedRecords.length === 0 && todayCourses.length === 0) {
        html = '<div class="empty-state"><p>今天没有课程安排</p></div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// 获取历史未打卡记录（已过期的未签到课程，不包括今天）
function getMissedAttendance() {
    const courses = getCourses();
    const attendance = getAttendance();
    const leaveRecords = getLeaveRecords();
    const today = getToday();
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // 预构建 O(1) 查找结构
    const attSetByCourse = {};
    attendance.forEach(a => {
        if (!attSetByCourse[a.courseId]) attSetByCourse[a.courseId] = new Set();
        attSetByCourse[a.courseId].add(a.date);
    });
    
    const leaveSetByCourse = {};
    leaveRecords.forEach(l => {
        if (!leaveSetByCourse[l.courseId]) leaveSetByCourse[l.courseId] = new Set();
        leaveSetByCourse[l.courseId].add(l.date);
    });
    
    let missedRecords = [];
    
    courses.forEach(course => {
        if (course.status !== 'active') return;
        
        const courseStart = course.startDate;
        const courseEnd = getCourseEffectiveEndDate(course);
        
        // 只考虑课程开始日期 <= 今天的课程
        if (courseStart > today) return;
        if (courseEnd < today) return;
        
        // 获取课程的所有上课星期
        const weekdays = Object.keys(course.schedule);
        const attSet = attSetByCourse[course.id] || new Set();
        const lvSet = leaveSetByCourse[course.id] || new Set();
        
        weekdays.forEach(day => {
            // 计算从课程开始到昨天的所有该星期的日期
            let currentDate = new Date(courseStart);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const end = new Date(Math.min(new Date(courseEnd).getTime(), yesterday.getTime()));
            
            // 获取星期索引（支持数字和中文名称）
            const dayIndex = getDayIndex(day);
            if (dayIndex === -1) return;
            
            // 找到第一个该星期的日期
            while (currentDate <= end && currentDate.getDay() !== (dayIndex + 1) % 7) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // 遍历所有该星期的日期（到昨天为止）
            while (currentDate <= end) {
                const dateStr = formatDate(currentDate);
                
                if (!attSet.has(dateStr) && !lvSet.has(dateStr)) {
                    missedRecords.push({
                        courseId: course.id,
                        date: dateStr,
                        schedule: course.schedule[day]
                    });
                }
                
                currentDate.setDate(currentDate.getDate() + 7);
            }
        });
    });
    
    // 按日期倒序排列（最近的在前）
    missedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return missedRecords;
}

// 历史记录请假函数
function showLeaveModalForMissed(courseId, date) {
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    // 找到该日期对应的星期和时间表
    let schedule = null;
    const weekdays = Object.keys(course.schedule);
    for (const day of weekdays) {
        // 检查该日期是否是这个星期的上课日
        const testDate = new Date(date);
        const dayIndex = getDayIndex(day);
        if (dayIndex !== -1 && testDate.getDay() === (dayIndex + 1) % 7) {
            schedule = course.schedule[day];
            break;
        }
    }
    
    document.getElementById('leaveCourseId').value = courseId;
    document.getElementById('leaveCourseName').value = course.courseName;
    document.getElementById('leaveCourseTime').value = schedule ? `${schedule.startTime}-${schedule.endTime}` : '-';
    document.getElementById('leaveCourseLocation').value = course.location || '-';
    document.getElementById('leaveReason').value = '';
    
    // 存储要请假的日期（用于confirmLeave时使用）
    document.getElementById('leaveModal').dataset.leaveDate = date;
    
    document.getElementById('leaveModal').style.display = 'flex';
}

// 取消请假函数
function cancelLeave(courseId, date) {
    if (!confirm('确定要取消这次请假吗？')) {
        return;
    }
    
    const leaveRecords = getLeaveRecords();
    
    // 找到并删除对应的请假记录
    const recordIndex = leaveRecords.findIndex(l => l.courseId === courseId && l.date === date);
    if (recordIndex === -1) {
        alert('未找到请假记录');
        return;
    }
    
    leaveRecords.splice(recordIndex, 1);
    saveLeaveRecords(leaveRecords);
    
    // 重新渲染
    renderAttendance();
    
    alert('请假已取消');
}

// 修改confirmLeave函数以支持历史日期请假和课时处理方式选择
function confirmLeave() {
    const courseId = document.getElementById('leaveCourseId').value;
    const reason = document.getElementById('leaveReason').value.trim();
    const leaveType = document.querySelector('input[name="leaveType"]:checked')?.value || 'deduct';
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    // 获取要请假的日期（支持历史日期）
    const leaveDate = document.getElementById('leaveModal').dataset.leaveDate || getToday();
    const today = getToday();
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    // 获取课程时间表
    const todayDay = new Date().getDay();
    const adjustedDay = todayDay === 0 ? 6 : todayDay - 1;
    const schedule = getDaySchedule(course, adjustedDay);
    
    // 判断是否已过上课时间
    const isClassOver = leaveDate < today || (leaveDate === today && currentTime > schedule.endTime);
    
    const leaveRecords = getLeaveRecords();
    
    // 检查该日期是否已经请假
    const exists = leaveRecords.some(l => l.courseId === courseId && l.date === leaveDate);
    if (exists) {
        alert('该日期已经请过假了');
        return;
    }
    
    const newLeaveRecord = {
        id: generateId(),
        courseId,
        studentName: course.studentName,
        courseName: course.courseName,
        date: leaveDate,
        time: new Date().toLocaleTimeString(),
        reason: reason || '未填写原因',
        isExtended: isClassOver, // 标记是否已过期（需要顺延）
        deductHours: leaveType === 'deduct' // 标记是否扣课时
    };
    
    leaveRecords.push(newLeaveRecord);
    saveLeaveRecords(leaveRecords);
    
    // 如果选择扣课时，按签到逻辑计费
    if (leaveType === 'deduct') {
        // 更新课程已用课时
        course.usedHours = (course.usedHours || 0) + 1;
        saveCourses(courses);
        
        // 更新关联缴费记录的已用课时（支持多缴费记录）
        if (course.paymentId) {
            const payments = getPayments();
            deductFromLinkedPayments(course, payments, 1);
            savePayments(payments);
        }
        
        alert('请假成功！已扣除1课时');
    } else {
        // 不扣课时，按课程顺延逻辑
        if (isClassOver && leaveDate === today) {
            // 今日已过上课时间请假，自动顺延到下次课程
            const nextDate = getNextClassDate(course, today);
            if (nextDate) {
                alert(`请假成功！由于已过上课时间，课程已顺延至 ${nextDate}`);
            } else {
                alert('请假成功！');
            }
        } else {
            alert('请假成功！课程将顺延');
        }
    }
    
    closeLeaveModal();
    renderAttendance();
    
    // 如果课时统计明细区域正在显示，同步更新未消课明细
    const statsDetailSection = document.getElementById('statsDetailSection');
    if (statsDetailSection && statsDetailSection.style.display === 'block') {
        const type = document.getElementById('statsDetailType').value;
        renderStatsDetail(type);
    }
}

// 获取下次课程日期
function getNextClassDate(course, fromDate) {
    const courseSchedule = course.schedule;
    const weekdays = Object.keys(courseSchedule);
    const fromDateObj = new Date(fromDate);
    
    // 从明天开始找
    let searchDate = new Date(fromDateObj);
    searchDate.setDate(searchDate.getDate() + 1);
    
    const courseEnd = getCourseEffectiveEndDate(course);
    
    // 最多找 30 天
    for (let i = 0; i < 30; i++) {
        const day = searchDate.getDay();
        const adjustedDay = day === 0 ? 6 : day - 1;
        const dateStr = formatDate(searchDate);
        
        // 检查是否是上课日且在课程有效期内
        if (courseSchedule[adjustedDay] && dateStr <= courseEnd && dateStr >= course.startDate) {
            return dateStr;
        }
        
        searchDate.setDate(searchDate.getDate() + 1);
    }
    
    return null;
}

// 取消今日签到
function cancelAttendanceToday(courseId) {
    if (!confirm('确定要取消今天的签到吗？')) {
        return;
    }
    
    const today = getToday();
    const attendance = getAttendance();
    const courses = getCourses();
    const payments = getPayments();
    
    // 找到今日的签到记录
    const recordIndex = attendance.findIndex(a => a.courseId === courseId && a.date === today);
    if (recordIndex === -1) {
        alert('未找到今日签到记录');
        return;
    }
    
    // 删除签到记录
    attendance.splice(recordIndex, 1);
    saveAttendance(attendance);
    
    // 恢复课程和缴费的已用课时
    const course = courses.find(c => c.id === courseId);
    if (course) {
        course.usedHours = Math.max(0, (course.usedHours || 0) - 1);
        saveCourses(courses);
        
        if (course.paymentId) {
            reverseFromLinkedPayments(course, payments, 1);
            savePayments(payments);
        }
    }
    
    // 重新渲染
    renderAttendance();
    renderStats();
    
    alert('签到已取消');
}

// ===== 多缴费记录辅助函数 =====
// 获取课程关联的缴费记录汇总信息
function getLinkedPaymentsSummary(course, payments) {
    const paymentIds = course.paymentId ? course.paymentId.split(',').map(id => id.trim()).filter(Boolean) : [];
    const linked = paymentIds.map(id => payments.find(p => p.id === id)).filter(Boolean);
    const totalHrs = linked.reduce((sum, p) => sum + p.totalHours, 0);
    const usedHrs = linked.reduce((sum, p) => sum + p.usedHours, 0);
    return { linked, totalHrs, usedHrs, remainingHrs: totalHrs - usedHrs };
}

// 按截止日期优先从多缴费记录中扣课时
// 返回被扣费的缴费记录，如果没有关联缴费则返回 null
function deductFromLinkedPayments(course, payments, amount) {
    amount = amount || 1;
    const paymentIds = course.paymentId ? course.paymentId.split(',').map(id => id.trim()).filter(Boolean) : [];
    const linkedPayments = paymentIds.map(id => payments.find(p => p.id === id)).filter(Boolean);
    
    if (linkedPayments.length === 0) return null;
    
    // 按截止日期排序：最早到期的优先消耗
    const sorted = [...linkedPayments].sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;   // 无截止日期排最后
        if (!b.endDate) return -1;
        return a.endDate.localeCompare(b.endDate);
    });
    
    // 找第一个还有剩余课时的，如果都没了就用第一个（允许负值）
    const target = sorted.find(p => (p.totalHours - p.usedHours) > 0) || sorted[0];
    target.usedHours += amount;
    return target;
}

// 从多缴费记录中退还课时（撤销签到）
function reverseFromLinkedPayments(course, payments, amount) {
    amount = amount || 1;
    const paymentIds = course.paymentId ? course.paymentId.split(',').map(id => id.trim()).filter(Boolean) : [];
    const linkedPayments = paymentIds.map(id => payments.find(p => p.id === id)).filter(Boolean);
    
    if (linkedPayments.length === 0) return;
    
    // 反向优先：从最晚到期且有已用课时的记录退还
    const sorted = [...linkedPayments].sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return -1;
        if (!b.endDate) return 1;
        return b.endDate.localeCompare(a.endDate);
    });
    
    const target = sorted.find(p => p.usedHours > 0) || sorted[0];
    target.usedHours = Math.max(0, target.usedHours - amount);
}
// ===== 多缴费记录辅助函数结束 =====

function showAttendanceModal(courseId, weekday) {
    const courses = getCourses();
    const payments = getPayments();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    const schedule = getDaySchedule(course, parseInt(weekday));
    
    // 处理多缴费记录关联（使用共享辅助函数）
    const summary = getLinkedPaymentsSummary(course, payments);
    
    let paymentInfo = '不关联';
    if (summary.linked.length > 0) {
        const orgs = [...new Set(summary.linked.map(p => p.organization).filter(Boolean))].join('/');
        paymentInfo = `已上 ${summary.usedHrs} / 总共 ${summary.totalHrs} 课时（剩余 ${summary.remainingHrs}） | ${orgs}`;
    }
    
    document.getElementById('attendanceCourseId').value = course.id;
    document.getElementById('attendanceCourseName').value = course.courseName;
    document.getElementById('attendanceCourseTime').value = `${schedule.startTime}-${schedule.endTime}`;
    document.getElementById('attendanceCourseLocation').value = course.location || '-';
    document.getElementById('attendancePaymentInfo').value = paymentInfo;
    
    document.getElementById('attendanceModal').style.display = 'flex';
}

function closeAttendanceModal() {
    document.getElementById('attendanceModal').style.display = 'none';
}

function confirmAttendance() {
    const courseId = document.getElementById('attendanceCourseId').value;
    const courses = getCourses();
    const payments = getPayments();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    const today = getToday();
    const attendance = getAttendance();
    
    // 多缴费记录：检查剩余课时并扣费
    const summary = getLinkedPaymentsSummary(course, payments);
    if (summary.linked.length > 0) {
        if (summary.remainingHrs <= 0) {
            const proceed = confirm(
                `⚠️ 关联缴费课时已用完！\n\n` +
                `已上 ${summary.usedHrs} / 总共 ${summary.totalHrs} 课时\n` +
                `超出 ${Math.abs(summary.remainingHrs)} 课时\n\n` +
                `点击"确定"继续签到（将产生负课时，后续关联新缴费记录后可核销）\n` +
                `点击"取消"返回`
            );
            if (!proceed) return;
        }
        deductFromLinkedPayments(course, payments, 1);
        savePayments(payments);
    }
    
    const newAttendance = {
        id: generateId(),
        courseId,
        studentName: course.studentName,
        courseName: course.courseName,
        date: today,
        time: new Date().toLocaleTimeString()
    };
    
    attendance.push(newAttendance);
    saveAttendance(attendance);
    
    course.usedHours = (course.usedHours || 0) + 1;
    saveCourses(courses);
    
    closeAttendanceModal();
    renderAttendance();
    renderStats();
    alert('签到成功');
}

// 请假相关函数
function showLeaveModal(courseId, weekday) {
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    const schedule = course.schedule[parseInt(weekday)];
    
    document.getElementById('leaveCourseId').value = course.id;
    document.getElementById('leaveCourseName').value = course.courseName;
    document.getElementById('leaveCourseTime').value = `${schedule.startTime}-${schedule.endTime}`;
    document.getElementById('leaveCourseLocation').value = course.location || '-';
    document.getElementById('leaveReason').value = '';
    
    document.getElementById('leaveModal').style.display = 'flex';
}

function closeLeaveModal() {
    document.getElementById('leaveModal').style.display = 'none';
}

// 课时明细相关函数
function showStatsDetail(type) {
    document.getElementById('statsDetailType').value = type;
    document.getElementById('statsDetailSection').style.display = 'block';
    renderStatsDetail(type);
}

function hideStatsDetail() {
    document.getElementById('statsDetailSection').style.display = 'none';
}

function renderStatsDetail(type) {
    const filterStudent = document.getElementById('statsStudentFilter')?.value || '';
    const filterOrg = document.getElementById('statsOrgFilter')?.value || '';
    const filterCourse = document.getElementById('statsCourseFilter')?.value || '';
    const startDate = document.getElementById('statsStartDate')?.value || '';
    const endDate = document.getElementById('statsEndDate')?.value || '';
    
    const courses = getCourses();
    const attendance = getAttendance();
    const payments = getPayments();
    
    let filteredCourses = courses;
    let filteredPayments = payments;
    
    if (filterStudent) {
        filteredCourses = filteredCourses.filter(c => c.studentName === filterStudent);
    }
    
    if (filterOrg) {
        const orgPayments = payments.filter(p => p.organization === filterOrg).map(p => p.id);
        filteredCourses = filteredCourses.filter(c => orgPayments.includes(c.paymentId));
        filteredPayments = filteredPayments.filter(p => p.organization === filterOrg);
    }
    
    if (filterCourse) {
        filteredCourses = filteredCourses.filter(c => c.courseName === filterCourse);
    }
    
    // 日期范围筛选也应用于课程列表（与renderStats保持一致）
    if (startDate || endDate) {
        filteredCourses = filteredCourses.filter(course => {
            const courseStart = course.startDate;
            const courseEnd = getCourseEffectiveEndDate(course);
            
            let isValid = true;
            if (startDate && courseEnd < startDate) {
                isValid = false;
            }
            if (endDate && courseStart > endDate) {
                isValid = false;
            }
            return isValid;
        });
        
        if (startDate) {
            filteredPayments = filteredPayments.filter(p => p.date >= startDate);
        }
        if (endDate) {
            filteredPayments = filteredPayments.filter(p => p.date <= endDate);
        }
    }
    
    if (type === 'used') {
        // 已消课明细 - 显示签到记录和扣课时的请假记录
        // 使用已经过滤后的课程列表来获取课程ID
        const filteredCourseIds = filteredCourses.map(c => c.id);
        
        // 获取扣课时的请假记录
        const leaveRecords = getLeaveRecords();
        let deductLeaveRecords = leaveRecords.filter(l => 
            filteredCourseIds.includes(l.courseId) && l.deductHours
        );
        
        let filteredAttendance = attendance.filter(a => filteredCourseIds.includes(a.courseId));
        
        if (startDate) {
            filteredAttendance = filteredAttendance.filter(a => a.date >= startDate);
            deductLeaveRecords = deductLeaveRecords.filter(l => l.date >= startDate);
        }
        
        if (endDate) {
            filteredAttendance = filteredAttendance.filter(a => a.date <= endDate);
            deductLeaveRecords = deductLeaveRecords.filter(l => l.date <= endDate);
        }
        
        document.getElementById('statsDetailTitle').textContent = '已消课明细';
        
        // 合并签到记录和扣课时请假记录
        const allRecords = [
            ...filteredAttendance.map(a => ({ ...a, type: 'attendance' })),
            ...deductLeaveRecords.map(l => ({ ...l, type: 'leave' }))
        ];
        
        // 按日期排序
        allRecords.sort((a, b) => b.date.localeCompare(a.date));
        
        if (allRecords.length === 0) {
            document.getElementById('statsDetailContent').innerHTML = '<div class="empty-state"><p>暂无消课记录</p></div>';
            return;
        }
        
        let html = '<table class="detail-table"><thead><tr><th>序号</th><th>日期</th><th>上课时间</th><th>学生姓名</th><th>课程名称</th><th>类型</th><th>操作</th></tr></thead><tbody>';
        const courses = getCourses();
        let rowIndex = 1;
        
        allRecords.forEach(record => {
            // 获取上课日期（课程安排的日期）
            const classDate = record.classDate || record.date;
            
            // 从课程数据中获取上课时间段
            const course = courses.find(c => c.id === record.courseId);
            let timeSlot = record.time;
            
            if (course) {
                // 根据日期获取对应的星期安排
                const dateObj = new Date(classDate);
                const dayOfWeek = dateObj.getDay();
                const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                
                // 获取课程安排（支持数字索引和中文星期名称）
                const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
                let schedule = null;
                
                if (course.schedule && course.schedule[adjustedDay]) {
                    schedule = course.schedule[adjustedDay];
                } else if (course.schedule && course.schedule[WEEKDAY_NAMES[adjustedDay]]) {
                    schedule = course.schedule[WEEKDAY_NAMES[adjustedDay]];
                }
                
                if (schedule && schedule.startTime && schedule.endTime) {
                    timeSlot = `${schedule.startTime}-${schedule.endTime}`;
                }
            }
            
            // 动态判断是签到还是补签
            let typeText = '';
            if (record.type === 'leave') {
                typeText = '请假(扣课时)';
            } else {
                // 判断是否为今天的签到
                const today = getToday();
                if (classDate === today) {
                    // 今天的签到，无论何时签，都显示为"签到"
                    typeText = '签到';
                } else {
                    // 不是今天的签到，显示为"补签"
                    typeText = '补签';
                }
            }
            
            html += `
                <tr>
                    <td>${rowIndex++}</td>
                    <td>${classDate}</td>
                    <td>${timeSlot}</td>
                    <td>${record.studentName}</td>
                    <td>${record.courseName}</td>
                    <td>${typeText}</td>
                    <td>
                        ${record.type === 'attendance' ? `<button class="btn btn-warning btn-sm" onclick="cancelAttendanceRecord('${record.id}')">取消签到</button>` : `<button class="btn btn-warning btn-sm" onclick="cancelLeaveRecord('${record.id}')">取消请假</button>`}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } else if (type === 'remaining') {
        // 剩余课时明细 - 显示还没有上的课程
        const today = getToday();
        const startDate = document.getElementById('statsStartDate')?.value || '';
        const endDate = document.getElementById('statsEndDate')?.value || '';
        const remainingStart = startDate && startDate > today ? startDate : today;
        const remainingEnd = endDate || '';
        
        document.getElementById('statsDetailTitle').textContent = '剩余课时明细';
        
        let futureClasses = [];
        const leaveRecords = getLeaveRecords();
        
        // 预构建 O(1) 查找结构
        const paymentMap = {};
        payments.forEach(p => { paymentMap[p.id] = p; });
        
        const attSetByCourse = {};
        attendance.forEach(a => {
            if (!attSetByCourse[a.courseId]) attSetByCourse[a.courseId] = new Set();
            attSetByCourse[a.courseId].add(a.date);
        });
        
        const leaveSetByCourse = {};
        leaveRecords.forEach(l => {
            if (!leaveSetByCourse[l.courseId]) leaveSetByCourse[l.courseId] = new Set();
            leaveSetByCourse[l.courseId].add(l.date);
        });
        
        filteredCourses.forEach(course => {
            if (course.status !== 'active') return;
            
            // 获取课程关联的缴费记录
            const payment = paymentMap[course.paymentId];
            if (!payment) return;
            
            // 计算剩余课时 = 总课时 - 已用课时
            const remainingHours = (payment.totalHours || 0) - (payment.usedHours || 0);
            if (remainingHours <= 0) return;
            
            const courseStart = course.startDate;
            const courseEnd = getCourseEffectiveEndDate(course);
            
            // 只显示未来的课程（在筛选范围内）
            if (courseEnd < remainingStart) return;
            
            // 当前课程已添加的未来课程数量
            let addedCount = 0;
            
            // 遍历课程的所有上课日期
            const weekdays = Object.keys(course.schedule);
            const attSet = attSetByCourse[course.id] || new Set();
            const lvSet = leaveSetByCourse[course.id] || new Set();
            
            weekdays.forEach(day => {
                // 计算从remainingStart到课程结束日期的所有该星期的日期
                let currentDate = new Date(remainingStart);
                // 限制最大遍历日期为1年后，避免无限循环
                const maxEndDate = new Date();
                maxEndDate.setFullYear(maxEndDate.getFullYear() + 1);
                let endTime = Math.min(new Date(courseEnd).getTime(), maxEndDate.getTime());
                if (remainingEnd) {
                    endTime = Math.min(endTime, new Date(remainingEnd).getTime());
                }
                const end = new Date(endTime);
                
                // 获取星期索引（支持数字和中文名称）
                const dayIndex = getDayIndex(day);
                if (dayIndex === -1) return;
                
                // 找到第一个该星期的日期（今天或以后）
                // getDay() 返回 0-6（周日到周六），WEEKDAY_NAMES[0] 是周一
                // 所以周一对应 getDay() = 1，需要转换
                const targetDayOfWeek = (dayIndex + 1) % 7;
                while (currentDate.getDay() !== targetDayOfWeek) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // 遍历所有该星期的日期（在筛选范围内）
                while (currentDate <= end && addedCount < remainingHours) {
                    const dateStr = formatDate(currentDate);
                    
                    if (!attSet.has(dateStr) && !lvSet.has(dateStr)) {
                        futureClasses.push({
                            courseId: course.id,
                            studentName: course.studentName,
                            courseName: course.courseName,
                            date: dateStr,
                            schedule: course.schedule[day]
                        });
                        addedCount++;
                    }
                    
                    currentDate.setDate(currentDate.getDate() + 7);
                }
            });
        });
        
        // 按日期、上课时间、学生姓名、课程名称排序
        futureClasses.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            
            const timeA = a.schedule?.startTime || '';
            const timeB = b.schedule?.startTime || '';
            const timeCompare = timeA.localeCompare(timeB);
            if (timeCompare !== 0) return timeCompare;
            
            const nameCompare = a.studentName.localeCompare(b.studentName, 'zh-CN');
            if (nameCompare !== 0) return nameCompare;
            
            return a.courseName.localeCompare(b.courseName, 'zh-CN');
        });
        
        if (futureClasses.length === 0) {
            document.getElementById('statsDetailContent').innerHTML = '<div class="empty-state"><p>暂无未上课的课程</p></div>';
            return;
        }
        
        let html = '<table class="detail-table"><thead><tr><th>序号</th><th>日期</th><th>上课时间</th><th>学生姓名</th><th>课程名称</th></tr></thead><tbody>';
        let rowIndex = 1;
        
        futureClasses.forEach(record => {
            const startTime = record.schedule?.startTime || '-';
            const endTime = record.schedule?.endTime || '-';
            
            html += `
                <tr>
                    <td>${rowIndex++}</td>
                    <td>${record.date}</td>
                    <td>${startTime}-${endTime}</td>
                    <td>${record.studentName}</td>
                    <td>${record.courseName}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } else if (type === 'missed') {
        // 请假记录明细 - 显示所有请假记录（包括扣课时和不扣课时）
        document.getElementById('statsDetailTitle').textContent = '请假记录明细';
        
        const leaveRecords = getLeaveRecords();
        const filteredCourseIds = filteredCourses.map(c => c.id);
        
        // 获取所有请假记录（包括扣课时和不扣课时）
        let allLeaveRecords = leaveRecords.filter(l => 
            filteredCourseIds.includes(l.courseId)
        );
        
        // 应用日期筛选
        if (startDate) {
            allLeaveRecords = allLeaveRecords.filter(l => l.date >= startDate);
        }
        if (endDate) {
            allLeaveRecords = allLeaveRecords.filter(l => l.date <= endDate);
        }
        
        // 为请假记录添加课程信息
        const leaveWithCourseInfo = allLeaveRecords.map(leave => {
            const course = filteredCourses.find(c => c.id === leave.courseId);
            if (!course) return null;
            
            // 获取该日期对应的时间表
            const leaveDateObj = new Date(leave.date);
            const dayOfWeek = leaveDateObj.getDay();
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const schedule = course.schedule[adjustedDay];
            
            return {
                ...leave,
                studentName: course.studentName,
                courseName: course.courseName,
                schedule: schedule || {}
            };
        }).filter(Boolean);
        
        // 按日期排序
        leaveWithCourseInfo.sort((a, b) => a.date.localeCompare(b.date));
        
        if (leaveWithCourseInfo.length === 0) {
            document.getElementById('statsDetailContent').innerHTML = '<div class="empty-state"><p>暂无请假记录</p></div>';
            return;
        }
        
        let html = '<table class="detail-table"><thead><tr><th>序号</th><th>日期</th><th>上课时间</th><th>学生姓名</th><th>课程名称</th><th>状态</th><th>操作</th></tr></thead><tbody>';
        let rowIndex = 1;
        
        leaveWithCourseInfo.forEach(record => {
            const timeSlot = record.schedule.startTime && record.schedule.endTime 
                ? `${record.schedule.startTime}-${record.schedule.endTime}` 
                : '-';
            
            const statusText = record.deductHours ? '请假(扣课时)' : '请假(不扣课时)';
            
            html += `
                <tr>
                    <td>${rowIndex++}</td>
                    <td>${record.date}</td>
                    <td>${timeSlot}</td>
                    <td>${record.studentName}</td>
                    <td>${record.courseName}</td>
                    <td>${statusText}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="cancelLeaveRecord('${record.id}')">取消请假</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } else if (type === 'consumedAmount') {
        // 已消费金额明细 - 按课程显示已消耗金额
        document.getElementById('statsDetailTitle').textContent = '已消费金额明细';
        
        // 预构建 paymentId → org 的映射（避免 sort 中的 O(n) find）
        const paymentOrgMap = {};
        const paymentMap = {};
        payments.forEach(p => {
            paymentOrgMap[p.id] = p.organization || '';
            paymentMap[p.id] = p;
        });
        
        // 按学生名称 → 机构名称 → 课程名称排序
        filteredCourses.sort((a, b) => {
            if (a.studentName !== b.studentName) {
                return a.studentName.localeCompare(b.studentName);
            }
            const orgA = paymentOrgMap[a.paymentId] || '';
            const orgB = paymentOrgMap[b.paymentId] || '';
            if (orgA !== orgB) {
                return orgA.localeCompare(orgB);
            }
            return a.courseName.localeCompare(b.courseName);
        });
        
        let html = '<table class="detail-table"><thead><tr><th>序号</th><th>学生姓名</th><th>机构名称</th><th>课程名称</th><th>已用课时</th><th>课时单价</th><th>已消费金额（元）</th></tr></thead><tbody>';
        let totalConsumed = 0;
        let totalUsedHours = 0;
        let rowIndex = 1;
        
        // 获取日期范围内的签到和扣课时请假记录，用于计算日期筛选后的已用课时
        const leaveRecords = getLeaveRecords();
        const filteredCourseIds = filteredCourses.map(c => c.id);
        let dateFilteredAttendance = attendance.filter(a => filteredCourseIds.includes(a.courseId));
        let dateFilteredLeave = leaveRecords.filter(l => filteredCourseIds.includes(l.courseId) && l.deductHours);
        
        if (startDate) {
            dateFilteredAttendance = dateFilteredAttendance.filter(a => a.date >= startDate);
            dateFilteredLeave = dateFilteredLeave.filter(l => l.date >= startDate);
        }
        if (endDate) {
            dateFilteredAttendance = dateFilteredAttendance.filter(a => a.date <= endDate);
            dateFilteredLeave = dateFilteredLeave.filter(l => l.date <= endDate);
        }
        
        // 预统计每个课程的消课次数
        const courseCountMap = {};
        dateFilteredAttendance.forEach(a => {
            courseCountMap[a.courseId] = (courseCountMap[a.courseId] || 0) + 1;
        });
        dateFilteredLeave.forEach(l => {
            courseCountMap[l.courseId] = (courseCountMap[l.courseId] || 0) + 1;
        });
        
        filteredCourses.forEach(course => {
            if (course.paymentId) {
                const payment = paymentMap[course.paymentId];
                if (payment && payment.originalAmount && payment.originalTotalHours > 0) {
                    const unitPrice = payment.originalAmount / payment.originalTotalHours;
                    
                    // 计算日期范围内的已用课时
                    const usedHoursInRange = courseCountMap[course.id] || 0;
                    const consumed = usedHoursInRange * unitPrice;
                    
                    // 只显示已消费金额大于0的记录
                    if (consumed > 0) {
                        totalConsumed += consumed;
                        totalUsedHours += usedHoursInRange;
                        
                        html += `
                            <tr>
                                <td>${rowIndex++}</td>
                                <td>${course.studentName}</td>
                                <td>${payment.organization || '-'}</td>
                                <td>${course.courseName}</td>
                                <td>${usedHoursInRange}</td>
                                <td>¥${unitPrice.toFixed(2)}</td>
                                <td>¥${consumed.toFixed(2)}</td>
                            </tr>
                        `;
                    }
                }
            }
        });
        
        html += `<tr><td colspan="4" style="text-align:right"><strong>合计</strong></td><td><strong>${totalUsedHours}</strong></td><td></td><td><strong>¥${totalConsumed.toFixed(2)}</strong></td></tr>`;
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } else if (type === 'totalAmount') {
        // 总缴费金额明细 - 显示所有缴费记录
        
        // 创建一个新的过滤后的缴费记录副本，避免影响其他类型
        let totalFilteredPayments = payments;
        
        // 应用学生过滤
        if (filterStudent) {
            totalFilteredPayments = totalFilteredPayments.filter(p => {
                return filteredCourses.some(c => c.paymentId === p.id);
            });
        }
        
        // 应用机构过滤
        if (filterOrg) {
            totalFilteredPayments = totalFilteredPayments.filter(p => p.organization === filterOrg);
        }
        
        if (startDate) {
            totalFilteredPayments = totalFilteredPayments.filter(p => p.date >= startDate);
        }
        
        if (endDate) {
            totalFilteredPayments = totalFilteredPayments.filter(p => p.date <= endDate);
        }
        
        document.getElementById('statsDetailTitle').textContent = '总缴费金额明细';
        
        if (totalFilteredPayments.length === 0) {
            document.getElementById('statsDetailContent').innerHTML = '<div class="empty-state"><p>暂无缴费记录</p></div>';
            return;
        }
        
        let html = '<table class="detail-table"><thead><tr><th>序号</th><th>缴费日期</th><th>机构名称</th><th>课包总价（元）</th><th>课包课时</th><th>金额（元）</th><th>课时</th></tr></thead><tbody>';
        let totalAmount = 0;
        let totalOriginalAmount = 0;
        let totalOriginalHours = 0;
        let totalHours = 0;
        let rowIndex = 1;
        
        totalFilteredPayments.forEach(payment => {
            const originalAmount = payment.originalAmount !== undefined ? payment.originalAmount : payment.amount;
            const originalTotalHours = payment.originalTotalHours !== undefined ? payment.originalTotalHours : payment.totalHours;
            totalAmount += payment.amount;
            totalOriginalAmount += originalAmount;
            totalOriginalHours += originalTotalHours;
            totalHours += payment.totalHours;
            
            html += `
                <tr>
                    <td>${rowIndex++}</td>
                    <td>${payment.date}</td>
                    <td>${payment.organization || '-'}</td>
                    <td>¥${originalAmount.toFixed(2)}</td>
                    <td>${originalTotalHours}</td>
                    <td>¥${payment.amount.toFixed(2)}</td>
                    <td>${payment.totalHours}</td>
                </tr>
            `;
        });
        
        html += `<tr><td colspan="3" style="text-align:right"><strong>合计</strong></td><td><strong>¥${totalOriginalAmount.toFixed(2)}</strong></td><td><strong>${totalOriginalHours}</strong></td><td><strong>¥${totalAmount.toFixed(2)}</strong></td><td><strong>${totalHours}</strong></td></tr>`;
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    }
}

function cancelAttendanceRecord(attendanceId) {
    if (!confirm('确定要取消这次签到吗？取消后该课程将回到未签到列表中。')) {
        return;
    }
    
    const attendance = getAttendance();
    const record = attendance.find(a => a.id === attendanceId);
    
    if (!record) return;
    
    // 恢复课程和缴费的已用课时
    const courses = getCourses();
    const payments = getPayments();
    
    const course = courses.find(c => c.id === record.courseId);
    if (course) {
        course.usedHours = Math.max(0, (course.usedHours || 0) - 1);
        saveCourses(courses);
        
        if (course.paymentId) {
            const payment = payments.find(p => p.id === course.paymentId);
            if (payment) {
                payment.usedHours = Math.max(0, payment.usedHours - 1);
                savePayments(payments);
            }
        }
    }
    
    // 删除签到记录
    const newAttendance = attendance.filter(a => a.id !== attendanceId);
    saveAttendance(newAttendance);
    
    // 重新渲染明细和统计
    const type = document.getElementById('statsDetailType').value;
    renderStatsDetail(type);
    renderStats();
    
    alert('签到已取消，该课程已回到未签到列表');
}

// 取消扣课时的请假记录
function cancelLeaveRecord(leaveId) {
    if (!confirm('确定要取消这次请假吗？如果是扣课时的请假，课时将被恢复。')) {
        return;
    }
    
    const leaveRecords = getLeaveRecords();
    const record = leaveRecords.find(l => l.id === leaveId);
    
    if (!record) return;
    
    // 如果是扣课时的请假，恢复课程和缴费的已用课时
    if (record.deductHours) {
        const courses = getCourses();
        const payments = getPayments();
        
        const course = courses.find(c => c.id === record.courseId);
        if (course) {
            course.usedHours = Math.max(0, (course.usedHours || 0) - 1);
            saveCourses(courses);
            
            if (course.paymentId) {
                const payment = payments.find(p => p.id === course.paymentId);
                if (payment) {
                    payment.usedHours = Math.max(0, payment.usedHours - 1);
                    savePayments(payments);
                }
            }
        }
    }
    
    // 删除请假记录
    const newLeaveRecords = leaveRecords.filter(l => l.id !== leaveId);
    saveLeaveRecords(newLeaveRecords);
    
    // 重新渲染明细和统计
    const type = document.getElementById('statsDetailType').value;
    renderStatsDetail(type);
    renderStats();
    
    alert('请假已取消');
}

function addManualAttendance(courseId, date) {
    const courses = getCourses();
    const payments = getPayments();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    const attendance = getAttendance();
    
    // 检查是否已经签到
    const exists = attendance.some(a => a.courseId === courseId && a.date === date);
    if (exists) {
        alert('该日期已经签到过了');
        return;
    }
    
    // 多缴费记录：检查剩余课时并扣费
    const summary = getLinkedPaymentsSummary(course, payments);
    if (summary.linked.length > 0) {
        if (summary.remainingHrs <= 0) {
            const proceed = confirm(
                `⚠️ 关联缴费课时已用完！\n\n` +
                `已上 ${summary.usedHrs} / 总共 ${summary.totalHrs} 课时\n` +
                `超出 ${Math.abs(summary.remainingHrs)} 课时\n\n` +
                `点击"确定"继续补签（将产生负课时，后续关联新缴费记录后可核销）\n` +
                `点击"取消"返回`
            );
            if (!proceed) return;
        }
        deductFromLinkedPayments(course, payments, 1);
        savePayments(payments);
    }
    
    // 判断是签到还是补签
    const today = getToday();
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    let attendanceType = '签到';
    
    // 如果是今天签到，且在上课时间内，算作签到
    if (date === today) {
        // 获取课程当天的上课时间安排
        const todayDay = now.getDay();
        const adjustedDay = todayDay === 0 ? 6 : todayDay - 1;
        const schedule = getDaySchedule(course, adjustedDay);
        
        if (schedule && schedule.startTime && schedule.endTime) {
            if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
                attendanceType = '补签';
            }
        } else {
            attendanceType = '补签';
        }
    } else {
        // 不是今天签到，算作补签
        attendanceType = '补签';
    }
    
    const newAttendance = {
        id: generateId(),
        courseId,
        studentName: course.studentName,
        courseName: course.courseName,
        date: date,
        time: attendanceType
    };
    
    attendance.push(newAttendance);
    saveAttendance(attendance);
    
    // 更新课程和缴费的已用课时
    course.usedHours = (course.usedHours || 0) + 1;
    saveCourses(courses);
    
    // 重新渲染明细、统计和签到页面
    const type = document.getElementById('statsDetailType').value;
    renderStatsDetail(type);
    renderStats();
    renderAttendance();
    
    alert('补签成功');
}

// 标签页切换
function switchTab(tabId) {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const selectedTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    const selectedContent = document.getElementById(`tab-${tabId}`);
    
    if (selectedTab) selectedTab.classList.add('active');
    if (selectedContent) selectedContent.classList.add('active');
}

// 初始化标签页点击事件
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    const checkboxes = document.querySelectorAll('#weekdayCheckboxes input');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            renderWeekdayTimePanel('weekdayCheckboxes', 'weekdayTimePanel');
        });
    });
    
    const editCheckboxes = document.querySelectorAll('#editWeekdayCheckboxes input');
    editCheckboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            renderWeekdayTimePanel('editWeekdayCheckboxes', 'editWeekdayTimePanel');
        });
    });
    
    const paymentSelect = document.getElementById('paymentId');
    if (paymentSelect) {
        paymentSelect.addEventListener('change', function() {
            const paymentId = this.value;
            if (paymentId) {
                const payments = getPayments();
                const payment = payments.find(p => p.id === paymentId);
                if (payment) {
                    document.getElementById('endDate').value = payment.endDate || '';
                }
            }
        });
    }
    
    const refundOptions = document.querySelectorAll('.refund-option');
    refundOptions.forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.refund-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            const radio = this.querySelector('input[type="radio"]');
            radio.checked = true;
        });
    });
});

// 页面初始化
function init() {
    initFirebase();  // 初始化云端同步
    importFromShareLink();  // 首先检查是否有分享链接数据需要导入
    initData();
    fixIncorrectUsedHours();  // 每次加载都检查并修复数据
    renderStudentSelector();
    updatePaymentFilters();
    renderPaymentTable();
    updatePaymentSelect();
    updateScheduleStudentFilter();
    updateDetailStudentFilter();
    updateCourseFilterOptions();
    updateStatsStudentFilter();
    
    document.getElementById('startDate').value = getToday();
    document.getElementById('endDate').value = '2999-12-31';
    
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const formattedToday = getToday();
    const formattedOneYearAgo = formatDate(oneYearAgo);
    const formattedOneYearLater = formatDate(oneYearLater);
    
    // 设置课表日期范围为本周
    const scheduleStartDateInput = document.getElementById('scheduleStartDate');
    const scheduleEndDateInput = document.getElementById('scheduleEndDate');
    if (scheduleStartDateInput) scheduleStartDateInput.value = getWeekStart();
    if (scheduleEndDateInput) scheduleEndDateInput.value = getWeekEnd();
    
    const detailStartDateInput = document.getElementById('detailStartDate');
    const detailEndDateInput = document.getElementById('detailEndDate');
    if (detailStartDateInput) detailStartDateInput.value = formattedOneYearAgo;
    if (detailEndDateInput) detailEndDateInput.value = formattedOneYearLater;
    
    const statsStartDateInput = document.getElementById('statsStartDate');
    const statsEndDateInput = document.getElementById('statsEndDate');
    if (statsStartDateInput) statsStartDateInput.value = formattedOneYearAgo;
    if (statsEndDateInput) statsEndDateInput.value = formattedOneYearLater;
    
    const students = getStudents();
    if (students.length > 0) {
        currentStudent = students[0];
    }
    
    renderAllSchedule();
    renderStudentCourses();
    
    // 默认显示今日签到页
    switchTab('attendance');
    renderStats();
    renderAttendance();
}

// 修复错误的已用课时数据
function fixIncorrectUsedHours() {
    const payments = getPayments();
    const courses = getCourses();
    
    // 找出所有已用课时 > 0 但没有关联课程或关联课程已用课时为0的缴费记录
    payments.forEach(payment => {
        if (payment.usedHours > 0) {
            // 查找关联的课程
            const relatedCourses = courses.filter(c => c.paymentId === payment.id);
            const totalUsedByCourses = relatedCourses.reduce((sum, c) => sum + (c.usedHours || 0), 0);
            
            // 如果缴费记录的已用课时和课程的已用课时不匹配，修正为课程的已用课时总和
            if (payment.usedHours !== totalUsedByCourses) {
                payment.usedHours = totalUsedByCourses;
                console.log(`修正缴费记录 ${payment.id} 的已用课时: ${payment.usedHours}`);
            }
        }
    });
    
    savePayments(payments);
    console.log('已修复错误的已用课时数据');
}

// 初始化数据
function initData() {
    const dataVersion = 'v12';
    const currentVersion = localStorage.getItem('dataVersion');
    
    // 如果是第一次使用或数据版本不同，进行增量更新
    if (!currentVersion || currentVersion !== dataVersion) {
        localStorage.setItem('dataVersion', dataVersion);
        
        // 如果没有学生数据，设置默认学生列表（包含新增的学生G和学生H）
        if (!localStorage.getItem('students')) {
            localStorage.setItem('students', JSON.stringify(['学生A', '学生B', '学生C', '学生D', '学生E', '学生F', '学生G', '学生H']));
        }
        
        // 如果没有缴费记录，设置默认缴费记录
        if (!localStorage.getItem('payments')) {
            // 默认缴费记录会在后面设置
        }
        
        // 如果没有课程数据，设置默认课程数据
        if (!localStorage.getItem('courses')) {
            // 默认课程数据会在后面设置
        }
        
        // 如果没有签到记录，设置默认签到记录
        if (!localStorage.getItem('attendance')) {
            // 默认签到记录会在后面设置
        }
        
        // 如果没有请假记录，初始化空数组
        if (!localStorage.getItem('leaveRecords')) {
            localStorage.setItem('leaveRecords', JSON.stringify([]));
        }
    }
    
    // 如果没有学生数据，设置默认学生列表
    if (!localStorage.getItem('students')) {
        localStorage.setItem('students', JSON.stringify(['学生A', '学生B', '学生C', '学生D', '学生E', '学生F', '学生G', '学生H']));
    }
    
    if (!localStorage.getItem('payments')) {
        localStorage.setItem('payments', JSON.stringify([
            {
                id: 'p1',
                date: '2026-01-01',
                organization: '智慧教育',
                amount: 7000,
                totalHours: 35,
                usedHours: 8,
                endDate: '2026-12-31',
                status: 'active',
                note: '2026年春季学期学费',
                originalAmount: 7000,
                originalTotalHours: 35
            },
            {
                id: 'p2',
                date: '2026-01-01',
                organization: '音乐艺术中心',
                amount: 6000,
                totalHours: 30,
                usedHours: 10,
                endDate: '2026-12-31',
                status: 'active',
                note: '钢琴课全年学费',
                originalAmount: 6000,
                originalTotalHours: 30
            },
            {
                id: 'p3',
                date: '2026-03-01',
                organization: '编程学院',
                amount: 4800,
                totalHours: 24,
                usedHours: 8,
                endDate: '2026-12-31',
                status: 'active',
                note: '编程课程学费',
                originalAmount: 4800,
                originalTotalHours: 24
            },
            {
                id: 'p4',
                date: '2026-02-15',
                organization: '智慧教育',
                amount: 5000,
                totalHours: 25,
                usedHours: 12,
                endDate: '2026-12-31',
                status: 'active',
                note: '数学提高班学费',
                originalAmount: 5000,
                originalTotalHours: 25
            },
            {
                id: 'p5',
                date: '2026-04-01',
                organization: '音乐艺术中心',
                amount: 3600,
                totalHours: 18,
                usedHours: 5,
                endDate: '2026-12-31',
                status: 'active',
                note: '小提琴课程学费',
                originalAmount: 3600,
                originalTotalHours: 18
            },
            {
                id: 'p6',
                date: '2026-01-15',
                organization: '编程学院',
                amount: 6400,
                totalHours: 32,
                usedHours: 20,
                endDate: '2026-12-31',
                status: 'active',
                note: '高级编程课程学费',
                originalAmount: 6400,
                originalTotalHours: 32
            }
        ]));
    }
    
    if (!localStorage.getItem('courses')) {
        localStorage.setItem('courses', JSON.stringify([
            {
                id: '1',
                studentName: '学生A',
                courseName: '数学一对一',
                totalHours: 20,
                usedHours: 5,
                paymentId: 'p1',
                schedule: {
                    '3': { startTime: '10:00', endTime: '12:00' }
                },
                location: '教室A-101',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '2',
                studentName: '学生A',
                courseName: '英语辅导',
                totalHours: 15,
                usedHours: 3,
                paymentId: 'p1',
                schedule: {
                    '5': { startTime: '14:00', endTime: '16:00' }
                },
                location: '教室B-201',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '3',
                studentName: '学生B',
                courseName: '钢琴课',
                totalHours: 30,
                usedHours: 10,
                paymentId: 'p2',
                schedule: {
                    '1': { startTime: '10:00', endTime: '12:00' },
                    '3': { startTime: '10:00', endTime: '12:00' }
                },
                location: '音乐教室',
                startDate: '2026-01-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '4',
                studentName: '学生C',
                courseName: '编程入门',
                totalHours: 24,
                usedHours: 8,
                paymentId: 'p3',
                schedule: {
                    '6': { startTime: '14:00', endTime: '15:30' }
                },
                location: '电脑室-301',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '5',
                studentName: '学生D',
                courseName: '数学提高班',
                totalHours: 25,
                usedHours: 12,
                paymentId: 'p4',
                schedule: {
                    '0': { startTime: '14:00', endTime: '16:00' },
                    '2': { startTime: '14:00', endTime: '16:00' },
                    '4': { startTime: '14:00', endTime: '16:00' }
                },
                location: '教室A-102',
                startDate: '2026-02-15',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '6',
                studentName: '学生E',
                courseName: '小提琴课',
                totalHours: 18,
                usedHours: 5,
                paymentId: 'p5',
                schedule: {
                    '1': { startTime: '16:00', endTime: '18:00' },
                    '3': { startTime: '16:00', endTime: '18:00' }
                },
                location: '音乐室-101',
                startDate: '2026-04-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '7',
                studentName: '学生F',
                courseName: '高级编程',
                totalHours: 32,
                usedHours: 20,
                paymentId: 'p6',
                schedule: {
                    '2': { startTime: '19:00', endTime: '21:00' },
                    '4': { startTime: '19:00', endTime: '21:00' },
                    '6': { startTime: '10:00', endTime: '12:00' }
                },
                location: '电脑室-301',
                startDate: '2026-01-15',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '8',
                studentName: '学生A',
                courseName: '物理实验',
                totalHours: 20,
                usedHours: 8,
                paymentId: 'p1',
                schedule: {
                    '1': { startTime: '08:00', endTime: '10:00' },
                    '4': { startTime: '08:00', endTime: '10:00' }
                },
                location: '实验室-201',
                startDate: '2026-02-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '9',
                studentName: '学生B',
                courseName: '声乐课',
                totalHours: 16,
                usedHours: 6,
                paymentId: 'p2',
                schedule: {
                    '2': { startTime: '10:00', endTime: '12:00' },
                    '5': { startTime: '10:00', endTime: '12:00' }
                },
                location: '音乐室-102',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            // 新增课程
            {
                id: '10',
                studentName: '学生D',
                courseName: '英语口语',
                totalHours: 20,
                usedHours: 8,
                paymentId: 'p4',
                schedule: {
                    '1': { startTime: '14:00', endTime: '16:00' },
                    '3': { startTime: '14:00', endTime: '16:00' }
                },
                location: '教室B-202',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '11',
                studentName: '学生E',
                courseName: '舞蹈课',
                totalHours: 24,
                usedHours: 10,
                paymentId: 'p5',
                schedule: {
                    '0': { startTime: '10:00', endTime: '12:00' },
                    '2': { startTime: '10:00', endTime: '12:00' },
                    '4': { startTime: '10:00', endTime: '12:00' }
                },
                location: '舞蹈室-101',
                startDate: '2026-04-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '12',
                studentName: '学生F',
                courseName: '围棋班',
                totalHours: 18,
                usedHours: 6,
                paymentId: 'p6',
                schedule: {
                    '0': { startTime: '16:00', endTime: '18:00' },
                    '3': { startTime: '16:00', endTime: '18:00' }
                },
                location: '活动室-101',
                startDate: '2026-02-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '13',
                studentName: '学生C',
                courseName: '机器人编程',
                totalHours: 30,
                usedHours: 15,
                paymentId: 'p3',
                schedule: {
                    '1': { startTime: '19:00', endTime: '21:00' },
                    '4': { startTime: '19:00', endTime: '21:00' }
                },
                location: '电脑室-302',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '14',
                studentName: '学生A',
                courseName: '化学实验',
                totalHours: 16,
                usedHours: 4,
                paymentId: 'p1',
                schedule: {
                    '2': { startTime: '08:00', endTime: '10:00' },
                    '5': { startTime: '08:00', endTime: '10:00' }
                },
                location: '实验室-202',
                startDate: '2026-04-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '15',
                studentName: '学生B',
                courseName: '素描课',
                totalHours: 24,
                usedHours: 12,
                paymentId: 'p2',
                schedule: {
                    '4': { startTime: '16:00', endTime: '18:00' },
                    '6': { startTime: '14:00', endTime: '16:00' }
                },
                location: '美术室-101',
                startDate: '2026-02-15',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '16',
                studentName: '学生D',
                courseName: '书法课',
                totalHours: 20,
                usedHours: 8,
                paymentId: 'p4',
                schedule: {
                    '6': { startTime: '08:00', endTime: '09:30' }
                },
                location: '活动室-102',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            // 周六早上重叠课程测试
            {
                id: '17',
                studentName: '学生G',
                courseName: '绘画班',
                totalHours: 12,
                usedHours: 4,
                paymentId: 'p1',
                schedule: {
                    '5': { startTime: '08:15', endTime: '09:45' }
                },
                location: '美术室-102',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '18',
                studentName: '学生H',
                courseName: '古筝课',
                totalHours: 16,
                usedHours: 6,
                paymentId: 'p2',
                schedule: {
                    '5': { startTime: '08:30', endTime: '10:00' }
                },
                location: '音乐室-103',
                startDate: '2026-04-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            // 其他不同时长课程
            {
                id: '19',
                studentName: '学生A',
                courseName: '阅读课',
                totalHours: 20,
                usedHours: 10,
                paymentId: 'p1',
                schedule: {
                    '0': { startTime: '16:00', endTime: '17:30' },
                    '3': { startTime: '10:00', endTime: '11:00' }
                },
                location: '阅览室-101',
                startDate: '2026-02-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '20',
                studentName: '学生B',
                courseName: '陶艺课',
                totalHours: 18,
                usedHours: 8,
                paymentId: 'p2',
                schedule: {
                    '2': { startTime: '14:30', endTime: '16:00' },
                    '5': { startTime: '14:00', endTime: '15:30' }
                },
                location: '手工室-101',
                startDate: '2026-03-15',
                endDate: '2026-12-31',
                status: 'active'
            },
            // 不同时间开始结束的课程测试
            {
                id: '21',
                studentName: '学生G',
                courseName: '书法进阶',
                totalHours: 20,
                usedHours: 5,
                paymentId: 'p3',
                schedule: {
                    '0': { startTime: '08:15', endTime: '09:45' },
                    '3': { startTime: '08:15', endTime: '09:45' }
                },
                location: '活动室-103',
                startDate: '2026-05-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '22',
                studentName: '学生H',
                courseName: '围棋进阶',
                totalHours: 24,
                usedHours: 8,
                paymentId: 'p4',
                schedule: {
                    '1': { startTime: '08:30', endTime: '10:15' },
                    '4': { startTime: '08:30', endTime: '10:15' }
                },
                location: '活动室-104',
                startDate: '2026-05-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '23',
                studentName: '学生E',
                courseName: '绘画高级',
                totalHours: 16,
                usedHours: 4,
                paymentId: 'p5',
                schedule: {
                    '2': { startTime: '08:45', endTime: '10:30' },
                    '5': { startTime: '08:45', endTime: '10:30' }
                },
                location: '美术室-103',
                startDate: '2026-05-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '24',
                studentName: '学生F',
                courseName: '舞蹈进阶',
                totalHours: 30,
                usedHours: 12,
                paymentId: 'p6',
                schedule: {
                    '0': { startTime: '14:15', endTime: '16:00' },
                    '3': { startTime: '14:15', endTime: '16:00' }
                },
                location: '舞蹈室-102',
                startDate: '2026-05-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '25',
                studentName: '学生A',
                courseName: '英语口语',
                totalHours: 20,
                usedHours: 6,
                paymentId: 'p1',
                schedule: {
                    '1': { startTime: '16:30', endTime: '18:00' },
                    '4': { startTime: '16:30', endTime: '18:00' }
                },
                location: '语言室-101',
                startDate: '2026-05-01',
                endDate: '2026-12-31',
                status: 'active'
            },
            {
                id: '26',
                studentName: '学生B',
                courseName: '乐器合奏',
                totalHours: 18,
                usedHours: 9,
                paymentId: 'p2',
                schedule: {
                    '3': { startTime: '19:15', endTime: '20:45' },
                    '6': { startTime: '19:15', endTime: '20:45' }
                },
                location: '音乐室-104',
                startDate: '2026-05-01',
                endDate: '2026-12-31',
                status: 'active'
            }
        ]));
    }
    
    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify([
            // 学生A - 数学一对一 (周四)
            { id: 'a1', courseId: '1', studentName: '学生A', courseName: '数学一对一', date: '2026-05-22', time: '09:15' },
            { id: 'a2', courseId: '1', studentName: '学生A', courseName: '数学一对一', date: '2026-05-15', time: '09:05' },
            { id: 'a3', courseId: '1', studentName: '学生A', courseName: '数学一对一', date: '2026-05-08', time: '09:10' },
            // 学生A - 英语辅导 (周六)
            { id: 'a4', courseId: '2', studentName: '学生A', courseName: '英语辅导', date: '2026-05-24', time: '14:05' },
            { id: 'a5', courseId: '2', studentName: '学生A', courseName: '英语辅导', date: '2026-05-17', time: '14:10' },
            // 学生A - 物理实验 (周二、周五)
            { id: 'a6', courseId: '8', studentName: '学生A', courseName: '物理实验', date: '2026-05-21', time: '09:00' },
            { id: 'a7', courseId: '8', studentName: '学生A', courseName: '物理实验', date: '2026-05-16', time: '09:05' },
            // 学生B - 钢琴课 (周二、周四)
            { id: 'a8', courseId: '3', studentName: '学生B', courseName: '钢琴课', date: '2026-05-20', time: '10:00' },
            { id: 'a9', courseId: '3', studentName: '学生B', courseName: '钢琴课', date: '2026-05-14', time: '10:05' },
            // 学生B - 声乐课 (周三、周六)
            { id: 'a10', courseId: '9', studentName: '学生B', courseName: '声乐课', date: '2026-05-24', time: '10:00' },
            { id: 'a11', courseId: '9', studentName: '学生B', courseName: '声乐课', date: '2026-05-21', time: '10:10' },
            // 学生C - 编程入门 (周日)
            { id: 'a12', courseId: '4', studentName: '学生C', courseName: '编程入门', date: '2026-05-18', time: '14:00' },
            { id: 'a13', courseId: '4', studentName: '学生C', courseName: '编程入门', date: '2026-05-11', time: '14:05' },
            // 学生D - 数学提高班 (周一、周三、周五)
            { id: 'a14', courseId: '5', studentName: '学生D', courseName: '数学提高班', date: '2026-05-23', time: '14:00' },
            { id: 'a15', courseId: '5', studentName: '学生D', courseName: '数学提高班', date: '2026-05-21', time: '14:05' },
            { id: 'a16', courseId: '5', studentName: '学生D', courseName: '数学提高班', date: '2026-05-19', time: '14:00' },
            // 学生E - 小提琴课 (周二、周四)
            { id: 'a17', courseId: '6', studentName: '学生E', courseName: '小提琴课', date: '2026-05-20', time: '16:00' },
            { id: 'a18', courseId: '6', studentName: '学生E', courseName: '小提琴课', date: '2026-05-16', time: '16:05' },
            // 学生F - 高级编程 (周三、周五、周日)
            { id: 'a19', courseId: '7', studentName: '学生F', courseName: '高级编程', date: '2026-05-22', time: '19:00' },
            { id: 'a20', courseId: '7', studentName: '学生F', courseName: '高级编程', date: '2026-05-18', time: '10:00' },
            { id: 'a21', courseId: '7', studentName: '学生F', courseName: '高级编程', date: '2026-05-15', time: '19:05' }
        ]));
    }
}