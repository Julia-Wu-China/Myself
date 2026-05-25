// 星期名称
const WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// 当前选中的学生
let currentStudent = '';

// localStorage 数据操作
function getStudents() {
    return JSON.parse(localStorage.getItem('students') || '[]');
}

function saveStudents(students) {
    localStorage.setItem('students', JSON.stringify(students));
}

function getPayments() {
    return JSON.parse(localStorage.getItem('payments') || '[]');
}

function savePayments(payments) {
    localStorage.setItem('payments', JSON.stringify(payments));
}

function getCourses() {
    return JSON.parse(localStorage.getItem('courses') || '[]');
}

function saveCourses(courses) {
    localStorage.setItem('courses', JSON.stringify(courses));
}

function getAttendance() {
    return JSON.parse(localStorage.getItem('attendance') || '[]');
}

function saveAttendance(attendance) {
    localStorage.setItem('attendance', JSON.stringify(attendance));
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

// 获取日期天数前
function getDateDaysAgo(days) {
    const now = new Date();
    now.setDate(now.getDate() - days);
    return `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
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
    const payments = getPayments();
    const tbody = document.getElementById('paymentTable').querySelector('tbody');
    
    if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">暂无缴费记录</td></tr>';
        return;
    }
    
    let html = '';
    payments.forEach(payment => {
        const remainingHours = payment.totalHours - payment.usedHours;
        const status = getPaymentStatus(payment);
        
        html += `<tr>`;
        html += `<td>${payment.date}</td>`;
        html += `<td>${payment.organization || '-'}</td>`;
        html += `<td>¥${payment.amount.toFixed(2)}</td>`;
        html += `<td>${payment.totalHours}</td>`;
        html += `<td>${payment.usedHours}</td>`;
        html += `<td>${remainingHours}</td>`;
        html += `<td>${payment.endDate || '-'}</td>`;
        html += `<td class="${status.class}">${status.text}</td>`;
        html += `<td class="actions">`;
        html += `<button class="btn btn-secondary" style="padding:5px 10px;font-size:12px" onclick="editPayment('${payment.id}')">编辑</button>`;
        html += `<button class="btn btn-danger" style="padding:5px 10px;font-size:12px" onclick="deletePayment('${payment.id}')">删除</button>`;
        if (payment.status !== 'ended' && remainingHours > 0) {
            html += `<button class="btn btn-warning" style="padding:5px 10px;font-size:12px;background:#ff9800;color:white" onclick="showEndPaymentModal('${payment.id}')">结束</button>`;
        }
        html += `</td>`;
        html += `</tr>`;
    });
    
    tbody.innerHTML = html;
}

// 更新缴费下拉框
function updatePaymentSelect() {
    const select = document.getElementById('paymentId');
    const payments = getPayments();
    
    select.innerHTML = '<option value="">不关联（直接录入）</option>';
    
    payments.forEach(payment => {
        const remainingHours = payment.totalHours - payment.usedHours;
        if (remainingHours > 0) {
            const option = document.createElement('option');
            option.value = payment.id;
            option.textContent = `${payment.date}-${payment.organization || '-'}-${payment.amount}元-剩余${remainingHours}课时`;
            select.appendChild(option);
        }
    });
}

// 添加缴费记录
function showAddPaymentModal() {
    document.getElementById('addPaymentModal').style.display = 'flex';
    document.getElementById('paymentDate').value = getToday();
    document.getElementById('paymentOrganization').value = '';
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentHours').value = '';
    document.getElementById('paymentEndDate').value = '2999-12-31';
    document.getElementById('paymentNote').value = '';
}

function closeAddPaymentModal() {
    document.getElementById('addPaymentModal').style.display = 'none';
}

function addPayment() {
    const date = document.getElementById('paymentDate').value;
    const organization = document.getElementById('paymentOrganization').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const hours = parseInt(document.getElementById('paymentHours').value);
    const endDate = document.getElementById('paymentEndDate').value;
    const note = document.getElementById('paymentNote').value;
    
    if (!date || !organization || !amount || !hours || !endDate) {
        alert('请填写完整信息');
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
        note
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
    
    document.getElementById('endPaymentModal').style.display = 'flex';
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
    
    payments[paymentIndex] = {
        ...payments[paymentIndex],
        date,
        organization,
        amount,
        totalHours,
        usedHours,
        endDate,
        note
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
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const checkboxes = document.querySelectorAll('#weekdayCheckboxes input:checked');
    const weekdays = Array.from(checkboxes).map(input => input.value);
    
    if (!studentName || !courseName || !startDate) {
        alert('请填写完整信息');
        return;
    }
    
    if (weekdays.length === 0) {
        alert('请选择至少一个上课星期');
        return;
    }
    
    const schedule = getWeekdayTimeData('weekdayTimePanel', weekdays);
    
    const course = {
        id: generateId(),
        studentName,
        courseName,
        totalHours,
        usedHours: 0,
        paymentId,
        schedule,
        location,
        startDate,
        endDate,
        status: 'active'
    };
    
    const courses = getCourses();
    courses.push(course);
    saveCourses(courses);
    
    // 如果关联了缴费记录，更新缴费的已用课时
    if (paymentId) {
        const payments = getPayments();
        const payment = payments.find(p => p.id === paymentId);
        if (payment) {
            payment.usedHours += totalHours;
            savePayments(payments);
        }
    }
    
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
    document.getElementById('editClassLocation').value = course.location || '';
    document.getElementById('editStartDate').value = course.startDate;
    document.getElementById('editEndDate').value = course.endDate || '';
    
    // 设置星期复选框
    const checkboxes = document.querySelectorAll('#editWeekdayCheckboxes input');
    const courseWeekdays = Object.keys(course.schedule);
    checkboxes.forEach(cb => {
        cb.checked = courseWeekdays.includes(cb.value);
    });
    
    renderWeekdayTimePanel('editWeekdayCheckboxes', 'editWeekdayTimePanel', course.schedule);
}

function closeEditCourseModal() {
    document.getElementById('editCourseModal').style.display = 'none';
}

function updateCourse() {
    const courseId = document.getElementById('editCourseId').value;
    const courses = getCourses();
    const courseIndex = courses.findIndex(c => c.id === courseId);
    
    if (courseIndex === -1) return;
    
    const courseName = document.getElementById('editCourseName').value;
    const totalHours = document.getElementById('editTotalHours').value ? parseInt(document.getElementById('editTotalHours').value) : Infinity;
    const location = document.getElementById('editClassLocation').value;
    const startDate = document.getElementById('editStartDate').value;
    const endDate = document.getElementById('editEndDate').value;
    
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
    
    const schedule = getWeekdayTimeData('editWeekdayTimePanel', weekdays);
    
    courses[courseIndex] = {
        ...courses[courseIndex],
        courseName,
        totalHours,
        location,
        startDate,
        endDate,
        schedule
    };
    
    saveCourses(courses);
    closeEditCourseModal();
    renderAllSchedule();
    renderStudentCourses();
    
    alert('课程已更新');
}

function deleteCourse() {
    const courseId = document.getElementById('editCourseId').value;
    
    if (!confirm('确定要删除这门课程吗？')) {
        return;
    }
    
    const courses = getCourses();
    const course = courses.find(c => c.id === courseId);
    
    if (course && course.paymentId) {
        const payments = getPayments();
        const payment = payments.find(p => p.id === course.paymentId);
        if (payment) {
            payment.usedHours -= (course.usedHours || 0);
            if (payment.usedHours < 0) payment.usedHours = 0;
            savePayments(payments);
        }
    }
    
    const newCourses = courses.filter(c => c.id !== courseId);
    saveCourses(newCourses);
    
    closeEditCourseModal();
    renderAllSchedule();
    renderStudentCourses();
    
    alert('课程已删除');
}

// 渲染全员总课表
function renderAllSchedule() {
    const filterStudent = document.getElementById('scheduleStudentFilter').value;
    const scheduleStartDate = document.getElementById('scheduleStartDate').value;
    const scheduleEndDate = document.getElementById('scheduleEndDate').value;
    let courses = getCourses();
    
    if (filterStudent) {
        courses = courses.filter(c => c.studentName === filterStudent);
    }
    
    if (scheduleStartDate || scheduleEndDate) {
        courses = courses.filter(course => {
            const courseStart = course.startDate;
            const courseEnd = course.endDate || '2999-12-31';
            
            let isValid = true;
            if (scheduleStartDate && courseEnd < scheduleStartDate) {
                isValid = false;
            }
            if (scheduleEndDate && courseStart > scheduleEndDate) {
                isValid = false;
            }
            return isValid;
        });
    }
    
    const table = document.getElementById('allScheduleTable');
    const tbody = table.querySelector('tbody');
    
    // 生成时间槽
    const timeSlots = ['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00', '19:00-21:00'];
    
    let html = '';
    
    timeSlots.forEach(slot => {
        const [slotStart, slotEnd] = slot.split('-');
        
        html += `<tr><td class="time-slot">${slot}</td>`;
        
        for (let day = 0; day < 7; day++) {
            const dayCourses = courses.filter(course => {
                const daySchedule = course.schedule[day];
                if (!daySchedule) return false;
                
                const courseStart = daySchedule.startTime;
                const courseEnd = daySchedule.endTime;
                
                return courseStart === slotStart && courseEnd === slotEnd;
            });
            
            if (dayCourses.length > 0) {
                const course = dayCourses[0];
                html += `<td><div class="class-cell" onclick="editCourse('${course.id}')">${course.studentName}<br>${course.courseName}</div></td>`;
            } else {
                html += `<td></td>`;
            }
        }
        
        html += `</tr>`;
    });
    
    tbody.innerHTML = html || '<tr><td colspan="8" class="empty-state">暂无课程安排</td></tr>';
}

// 渲染学生课程详情
function renderStudentCourses() {
    const filterStudent = document.getElementById('detailStudentFilter').value;
    const detailStartDate = document.getElementById('detailStartDate').value;
    const detailEndDate = document.getElementById('detailEndDate').value;
    
    let courses = getCourses();
    const payments = getPayments();
    
    if (filterStudent) {
        courses = courses.filter(c => c.studentName === filterStudent);
    }
    
    if (detailStartDate || detailEndDate) {
        courses = courses.filter(course => {
            const courseStart = course.startDate;
            const courseEnd = course.endDate || '2999-12-31';
            
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
    
    const container = document.getElementById('studentCourseDetail');
    
    if (courses.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>暂无课程记录</p></div>';
        return;
    }
    
    let html = '';
    
    courses.forEach(course => {
        const payment = payments.find(p => p.id === course.paymentId);
        const remainingHours = course.totalHours === Infinity ? '无限' : (course.totalHours - (course.usedHours || 0));
        const usedHours = course.usedHours || 0;
        const totalHours = course.totalHours === Infinity ? '无限' : course.totalHours;
        
        let scheduleHtml = '';
        Object.entries(course.schedule).forEach(([day, time]) => {
            scheduleHtml += `<div class="schedule-item"><span>${WEEKDAY_NAMES[parseInt(day)]}</span><span>${time.startTime}-${time.endTime}</span></div>`;
        });
        
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
                ${payment ? `<div class="course-card-payment">关联缴费：${payment.date} ${payment.organization} ¥${payment.amount}</div>` : ''}
                <div class="course-card-actions">
                    <button class="btn btn-secondary" onclick="editCourse('${course.id}')">编辑</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 渲染课时统计
function renderStats() {
    const filterStudent = document.getElementById('statsStudentFilter')?.value || '';
    const startDate = document.getElementById('statsStartDate')?.value || '';
    const endDate = document.getElementById('statsEndDate')?.value || '';
    
    const courses = getCourses();
    const payments = getPayments();
    
    let filteredCourses = courses;
    let filteredPayments = payments;
    
    if (filterStudent) {
        filteredCourses = filteredCourses.filter(c => c.studentName === filterStudent);
        
        const studentCourses = filteredCourses.map(c => c.id);
        filteredPayments = filteredPayments.filter(p => {
            return filteredCourses.some(c => c.paymentId === p.id);
        });
    }
    
    if (startDate || endDate) {
        filteredCourses = filteredCourses.filter(course => {
            const courseStart = course.startDate;
            const courseEnd = course.endDate || '2999-12-31';
            
            let isValid = true;
            if (startDate && courseEnd < startDate) {
                isValid = false;
            }
            if (endDate && courseStart > endDate) {
                isValid = false;
            }
            return isValid;
        });
    }
    
    let totalUsedHours = 0;
    let totalRemainingHours = 0;
    let totalPaidAmount = 0;
    let totalConsumedAmount = 0;
    
    filteredCourses.forEach(course => {
        totalUsedHours += course.usedHours || 0;
        if (course.totalHours !== Infinity) {
            totalRemainingHours += (course.totalHours - (course.usedHours || 0));
        }
    });
    
    filteredPayments.forEach(payment => {
        totalPaidAmount += payment.amount;
        totalConsumedAmount += payment.amount * (payment.usedHours / payment.totalHours);
    });
    
    const statValues = document.querySelectorAll('#statsGrid .stat-value');
    statValues[0].textContent = totalUsedHours;
    statValues[1].textContent = totalRemainingHours;
    statValues[2].textContent = totalConsumedAmount.toFixed(0);
    statValues[3].textContent = totalPaidAmount.toFixed(0);
}

// 渲染今日签到
function renderAttendance() {
    const attendance = getAttendance();
    const courses = getCourses();
    const payments = getPayments();
    const today = getToday();
    const todayDay = new Date().getDay();
    const adjustedDay = todayDay === 0 ? 6 : todayDay - 1;
    
    const container = document.getElementById('attendanceSection');
    
    const todayCourses = courses.filter(course => {
        if (course.status !== 'active') return false;
        if (!course.schedule[adjustedDay]) return false;
        
        const courseStart = course.startDate;
        const courseEnd = course.endDate || '2999-12-31';
        
        if (courseStart > today || courseEnd < today) return false;
        
        return true;
    });
    
    if (todayCourses.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>今天没有课程安排</p></div>';
        return;
    }
    
    let html = '<div class="attendance-list">';
    
    todayCourses.forEach(course => {
        const schedule = course.schedule[adjustedDay];
        const isSigned = attendance.some(a => 
            a.courseId === course.id && a.date === today
        );
        
        const payment = payments.find(p => p.id === course.paymentId);
        const remainingHours = payment ? (payment.totalHours - payment.usedHours) : '无限';
        
        html += `
            <div class="attendance-item ${isSigned ? 'signed' : ''}">
                <div class="course-info">
                    <div class="course-name">${course.courseName}</div>
                    <div class="course-time">${schedule.startTime}-${schedule.endTime} | ${course.location || '-'} | 剩余${remainingHours}课时</div>
                </div>
                <button class="attendance-btn ${isSigned ? 'signed' : 'available'}" 
                    onclick="${isSigned ? '' : `showAttendanceModal('${course.id}', '${adjustedDay}')`}"
                    ${isSigned ? 'disabled' : ''}>
                    ${isSigned ? '已签到' : '签到'}
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function showAttendanceModal(courseId, weekday) {
    const courses = getCourses();
    const payments = getPayments();
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;
    
    const schedule = course.schedule[parseInt(weekday)];
    const payment = payments.find(p => p.id === course.paymentId);
    
    document.getElementById('attendanceCourseId').value = course.id;
    document.getElementById('attendanceCourseName').value = course.courseName;
    document.getElementById('attendanceCourseTime').value = `${schedule.startTime}-${schedule.endTime}`;
    document.getElementById('attendanceCourseLocation').value = course.location || '-';
    document.getElementById('attendancePaymentInfo').value = payment 
        ? `${payment.organization} - 剩余${payment.totalHours - payment.usedHours}课时`
        : '不关联';
    
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
    
    if (course.paymentId) {
        const payment = payments.find(p => p.id === course.paymentId);
        if (payment) {
            payment.usedHours += 1;
            savePayments(payments);
        }
    }
    
    course.usedHours = (course.usedHours || 0) + 1;
    saveCourses(courses);
    
    closeAttendanceModal();
    renderAttendance();
    renderStats();
    alert('签到成功');
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
    initData();
    renderStudentSelector();
    renderPaymentTable();
    updatePaymentSelect();
    updateScheduleStudentFilter();
    updateDetailStudentFilter();
    updateStatsStudentFilter();
    
    document.getElementById('startDate').value = getToday();
    document.getElementById('endDate').value = '2999-12-31';
    
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    const formattedToday = getToday();
    const formattedThreeMonthsAgo = formatDate(threeMonthsAgo);
    
    const scheduleStartDateInput = document.getElementById('scheduleStartDate');
    const scheduleEndDateInput = document.getElementById('scheduleEndDate');
    if (scheduleStartDateInput) scheduleStartDateInput.value = formattedThreeMonthsAgo;
    if (scheduleEndDateInput) scheduleEndDateInput.value = formattedToday;
    
    const detailStartDateInput = document.getElementById('detailStartDate');
    const detailEndDateInput = document.getElementById('detailEndDate');
    if (detailStartDateInput) detailStartDateInput.value = formattedThreeMonthsAgo;
    if (detailEndDateInput) detailEndDateInput.value = formattedToday;
    
    const statsStartDateInput = document.getElementById('statsStartDate');
    const statsEndDateInput = document.getElementById('statsEndDate');
    if (statsStartDateInput) statsStartDateInput.value = formattedThreeMonthsAgo;
    if (statsEndDateInput) statsEndDateInput.value = formattedToday;
    
    const students = getStudents();
    if (students.length > 0) {
        currentStudent = students[0];
    }
    
    renderAllSchedule();
    renderStudentCourses();
    renderStats();
    renderAttendance();
}

// 初始化数据
function initData() {
    if (!localStorage.getItem('students')) {
        localStorage.setItem('students', JSON.stringify(['学生A', '学生B', '学生C']));
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
                note: '2026年春季学期学费'
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
                note: '钢琴课全年学费'
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
                note: '编程课程学费'
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
                    '3': { startTime: '09:00', endTime: '11:00' }
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
                    '6': { startTime: '09:00', endTime: '11:00' }
                },
                location: '计算机教室',
                startDate: '2026-03-01',
                endDate: '2026-12-31',
                status: 'active'
            }
        ]));
    }
    
    if (!localStorage.getItem('attendance')) {
        localStorage.setItem('attendance', JSON.stringify([]));
    }
}