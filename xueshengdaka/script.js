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

// 请假记录操作
function getLeaveRecords() {
    return JSON.parse(localStorage.getItem('leaveRecords') || '[]');
}

function saveLeaveRecords(leaveRecords) {
    localStorage.setItem('leaveRecords', JSON.stringify(leaveRecords));
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
const studentColors = {
    '学生A': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    '学生B': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    '学生C': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    '学生D': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    '学生E': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    '学生F': 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    '学生G': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    '学生H': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
};

// 根据学生名获取颜色
function getStudentColor(studentName) {
    return studentColors[studentName] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

// 生成时间槽（每小时一个槽）
function generateTimeSlots() {
    const slots = [];
    const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
                   '14:00', '15:00', '16:00', '17:00', '18:00',
                   '19:00', '20:00', '21:00'];
    
    for (let i = 0; i < times.length - 1; i++) {
        slots.push(`${times[i]}-${times[i + 1]}`);
    }
    
    return slots;
}

// 判断两个时间段是否重叠
function isTimeOverlap(start1, end1, start2, end2) {
    return start1 < end2 && start2 < end1;
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
        // 恢复原状
        table.style.transform = '';
        table.style.width = '';
        table.style.height = '';
        table.style.position = '';
        container.style.overflowX = 'auto';
        container.style.overflowY = '';
        container.style.height = '';
    } else {
        // 旋转90度并适配容器
        const containerWidth = container.offsetWidth;
        
        // 课程表高度 = 容器宽度 - 5px
        const targetHeight = containerWidth - 5;
        const tableWidth = table.offsetWidth;
        
        // 计算缩放比例
        const scale = targetHeight / tableWidth;
        
        // 设置表格样式
        table.style.transform = `rotate(90deg) scale(${scale})`;
        table.style.transformOrigin = 'center center';
        table.style.width = `${containerWidth}px`;
        table.style.height = `${targetHeight}px`;
        table.style.position = 'relative';
        
        // 设置容器高度 = 课程表高度 + 5px
        container.style.overflow = 'hidden';
        container.style.height = `${targetHeight + 5}px`;
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
    document.getElementById('addPaymentEndDate').value = '2999-12-31';
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
    const endDate = document.getElementById('addPaymentEndDate').value;
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
    const amount = parseFloat(document.getElementById('renewAmount').value);
    const hours = parseInt(document.getElementById('renewHours').value);
    const note = document.getElementById('renewNote').value;
    
    if (!endDate || !amount || !hours) {
        alert('请填写完整信息');
        return;
    }
    
    const payments = getPayments();
    const paymentIndex = payments.findIndex(p => p.id === paymentId);
    
    if (paymentIndex === -1) return;
    
    const payment = payments[paymentIndex];
    
    // 更新缴费记录：增加金额和课时
    payment.amount += amount;
    payment.totalHours += hours;
    payment.endDate = endDate;
    payment.status = 'active';
    
    if (note) {
        payment.note = (payment.note || '') + '; ' + note;
    }
    
    savePayments(payments);
    closeRenewPaymentModal();
    renderPaymentTable();
    updatePaymentSelect();
    
    alert('续费成功');
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
    
    // 添加筛选器联动事件
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
    
    const course = courses[courseIndex];
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
    
    // 验证总课时不能小于已上课时
    const usedHours = course.usedHours || 0;
    if (totalHours !== Infinity && totalHours < usedHours) {
        alert(`总课时不能小于已用课时（已用 ${usedHours} 课时）`);
        return;
    }
    
    const schedule = getWeekdayTimeData('editWeekdayTimePanel', weekdays);
    
    const updatedCourse = {
        ...course,
        courseName,
        totalHours,
        location,
        startDate,
        endDate,
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

function deleteCourse() {
    const courseId = document.getElementById('editCourseId').value;
    
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
    saveCourses(courses);
    
    closeEndCourseModal();
    renderAllSchedule();
    renderStudentCourses();
    
    alert('课程已结束');
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
    courses.forEach(course => {
        for (let day = 0; day < 7; day++) {
            const daySchedule = course.schedule[day];
            if (!daySchedule) continue;
            
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
    
    // 为每个课程计算其在表格中的位置
    courses.forEach(course => {
        for (let day = 0; day < 7; day++) {
            const daySchedule = course.schedule[day];
            if (!daySchedule) continue;
            
            const courseStart = daySchedule.startTime;
            const courseEnd = daySchedule.endTime;
            
            // 找到课程开始和结束的时间槽索引
            let startSlotIndex = -1;
            let endSlotIndex = -1;
            
            timeSlots.forEach((slot, index) => {
                const [slotStart, slotEnd] = slot.split('-');
                // 课程开始时间在当前时间槽内或等于槽开始时间
                if (isTimeOverlap(slotStart, slotEnd, courseStart, courseStart)) {
                    startSlotIndex = index;
                }
                // 课程结束时间在当前时间槽内
                if (isTimeOverlap(slotStart, slotEnd, courseEnd, courseEnd)) {
                    endSlotIndex = index;
                }
            });
            
            if (startSlotIndex >= 0 && endSlotIndex >= 0) {
                const rowSpan = endSlotIndex - startSlotIndex + 1;
                
                // 添加到起始单元格
                cellData[startSlotIndex][day].courses.push({
                    course,
                    daySchedule,
                    rowSpan
                });
                
                // 更新最大跨越行数
                if (rowSpan > cellData[startSlotIndex][day].maxRowSpan) {
                    cellData[startSlotIndex][day].maxRowSpan = rowSpan;
                }
                
                // 标记中间的单元格为已占用
                for (let i = startSlotIndex + 1; i <= endSlotIndex; i++) {
                    cellData[i][day].occupied = true;
                }
            }
        }
    });
    
    // 生成表格HTML
    let html = '';
    
    timeSlots.forEach((slot, slotIndex) => {
        const [slotStart] = slot.split('-');
        
        html += `<tr><td class="time-slot">${slotStart}</td>`;
        
        for (let day = 0; day < 7; day++) {
            const cell = cellData[slotIndex][day];
            
            if (cell.occupied) {
                // 被合并的单元格，不输出
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
                    // 根据实际时长计算高度（每分钟0.8px）
                    const duration = getDurationMinutes(c.daySchedule.startTime, c.daySchedule.endTime);
                    const height = duration * 0.8;
                    // 计算顶部偏移（相对于时间槽开始时间）
                    const slotStartTime = slotStart;
                    const offset = getDurationMinutes(slotStartTime, c.daySchedule.startTime);
                    const marginTop = offset * 0.8;
                    html += `<td rowspan="${c.rowSpan}" style="vertical-align: top;"><div class="class-cell" onclick="editCourse('${c.course.id}')" style="background:${bgColor}; height:${height}px; margin-top:${marginTop}px;">${c.course.courseName}<br>${c.course.studentName}<br>${time}<br>${c.course.location}</div></td>`;
                } else {
                    // 多个课程重叠，横向并排显示
                    let cellContent = '<div class="class-cell-multi">';
                    cell.courses.forEach(c => {
                        const time = `${c.daySchedule.startTime}-${c.daySchedule.endTime}`;
                        const bgColor = getStudentColor(c.course.studentName);
                        // 根据实际时长计算高度（每分钟0.8px）
                        const duration = getDurationMinutes(c.daySchedule.startTime, c.daySchedule.endTime);
                        const height = duration * 0.8;
                        // 计算顶部偏移（相对于时间槽开始时间）
                        const slotStartTime = slotStart;
                        const offset = getDurationMinutes(slotStartTime, c.daySchedule.startTime);
                        const marginTop = offset * 0.8;
                        cellContent += `<div class="class-cell-item" onclick="editCourse('${c.course.id}')" style="background:${bgColor}; height:${height}px; margin-top:${marginTop}px;">${c.course.courseName}<br>${c.course.studentName}<br>${time}<br>${c.course.location}</div>`;
                    });
                    cellContent += '</div>';
                    html += `<td rowspan="${maxRowSpan}">${cellContent}</td>`;
                }
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
    const filterStatus = document.getElementById('detailStatusFilter').value;
    
    let courses = getCourses();
    const payments = getPayments();
    
    if (filterStudent) {
        courses = courses.filter(c => c.studentName === filterStudent);
    }
    
    if (filterStatus) {
        courses = courses.filter(c => c.status === filterStatus);
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
                    ${course.status === 'active' ? `<button class="btn btn-danger" style="background:#dc3545;color:white" onclick="showEndCourseModal('${course.id}')">结束</button>` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 渲染课时统计
function renderStats() {
    const filterStudent = document.getElementById('statsStudentFilter')?.value || '';
    const filterOrg = document.getElementById('statsOrgFilter')?.value || '';
    const filterCourse = document.getElementById('statsCourseFilter')?.value || '';
    const startDate = document.getElementById('statsStartDate')?.value || '';
    const endDate = document.getElementById('statsEndDate')?.value || '';
    
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
    
    // 计算已消耗课时（只计算签到记录，不包括请假）
    let totalUsedHours = 0;
    let totalRemainingHours = 0;
    let totalPaidAmount = 0;
    let totalConsumedAmount = 0;
    
    // 根据签到记录计算实际已消耗课时
    const filteredCourseIds = filteredCourses.map(c => c.id);
    const filteredAttendance = attendance.filter(a => filteredCourseIds.includes(a.courseId));
    
    // 统计每个课程的签到次数
    const courseAttendanceCount = {};
    filteredAttendance.forEach(record => {
        courseAttendanceCount[record.courseId] = (courseAttendanceCount[record.courseId] || 0) + 1;
    });
    
    filteredCourses.forEach(course => {
        // 使用实际签到次数作为已用课时
        const actualUsedHours = courseAttendanceCount[course.id] || 0;
        totalUsedHours += actualUsedHours;
        
        if (course.totalHours !== Infinity) {
            totalRemainingHours += (course.totalHours - actualUsedHours);
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
        if (!course.schedule[adjustedDay]) return false;
        
        const courseStart = course.startDate;
        const courseEnd = course.endDate || '2999-12-31';
        
        if (courseStart > today || courseEnd < today) return false;
        
        return true;
    });
    
    if (todayCourses.length > 0) {
        html += '<div class="today-section"><h4>🎯 今日课程</h4>';
        
        todayCourses.forEach(course => {
            const schedule = course.schedule[adjustedDay];
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
                        <button class="attendance-btn ${isSigned ? 'signed' : (isLeave ? 'disabled' : 'available')} ${isClassNotStarted && !isLeave ? 'disabled' : ''}" 
                            onclick="${isLeave ? '' : (isClassNotStarted && !isLeave ? '' : (isSigned ? `cancelAttendanceToday('${course.id}')` : `showAttendanceModal('${course.id}', '${adjustedDay}')`))}"
                            ${isLeave || (isClassNotStarted && !isLeave) ? 'disabled' : ''}>
                            ${isSigned ? '取消签到' : (isLeave ? '已请假' : (isClassNotStarted ? '未到时间' : '签到'))}
                        </button>
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
    
    let missedRecords = [];
    
    courses.forEach(course => {
        if (course.status !== 'active') return;
        
        const courseStart = course.startDate;
        const courseEnd = course.endDate || '2999-12-31';
        
        // 只考虑课程开始日期 <= 今天的课程
        if (courseStart > today) return;
        
        // 获取课程的所有上课星期
        const weekdays = Object.keys(course.schedule);
        
        weekdays.forEach(day => {
            // 计算从课程开始到昨天的所有该星期的日期
            let currentDate = new Date(courseStart);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const end = new Date(Math.min(new Date(courseEnd).getTime(), yesterday.getTime()));
            
            // 找到第一个该星期的日期
            while (currentDate <= end && currentDate.getDay() !== (parseInt(day) + 1) % 7) {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // 遍历所有该星期的日期（到昨天为止）
            while (currentDate <= end) {
                const dateStr = formatDate(currentDate);
                
                // 检查是否已经签到或请假
                const isSigned = attendance.some(a => a.courseId === course.id && a.date === dateStr);
                const isLeave = leaveRecords.some(l => l.courseId === course.id && l.date === dateStr);
                
                if (!isSigned && !isLeave) {
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
        if (testDate.getDay() === (parseInt(day) + 1) % 7) {
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

// 修改confirmLeave函数以支持历史日期请假
function confirmLeave() {
    const courseId = document.getElementById('leaveCourseId').value;
    const reason = document.getElementById('leaveReason').value.trim();
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
    const schedule = course.schedule[adjustedDay];
    
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
        isExtended: isClassOver // 标记是否已过期（需要顺延）
    };
    
    leaveRecords.push(newLeaveRecord);
    saveLeaveRecords(leaveRecords);
    
    // 如果是已过期的请假，自动处理顺延
    if (isClassOver && leaveDate === today) {
        // 今日已过上课时间请假，自动顺延到下次课程
        const nextDate = getNextClassDate(course, today);
        if (nextDate) {
            alert(`请假成功！由于已过上课时间，课程已顺延至 ${nextDate}`);
        } else {
            alert('请假成功！');
        }
    } else {
        alert('请假成功！');
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
    
    const courseEnd = course.endDate || '2999-12-31';
    
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
            const payment = payments.find(p => p.id === course.paymentId);
            if (payment) {
                payment.usedHours = Math.max(0, payment.usedHours - 1);
                savePayments(payments);
            }
        }
    }
    
    // 重新渲染
    renderAttendance();
    renderStats();
    
    alert('签到已取消');
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
    
    if (filterStudent) {
        filteredCourses = filteredCourses.filter(c => c.studentName === filterStudent);
    }
    
    if (filterOrg) {
        const orgPayments = payments.filter(p => p.organization === filterOrg).map(p => p.id);
        filteredCourses = filteredCourses.filter(c => orgPayments.includes(c.paymentId));
    }
    
    if (filterCourse) {
        filteredCourses = filteredCourses.filter(c => c.courseName === filterCourse);
    }
    
    if (type === 'used') {
        // 已消课明细 - 显示签到记录
        // 使用已经过滤后的课程列表来获取课程ID
        const filteredCourseIds = filteredCourses.map(c => c.id);
        
        let filteredAttendance = attendance.filter(a => filteredCourseIds.includes(a.courseId));
        
        if (startDate) {
            filteredAttendance = filteredAttendance.filter(a => a.date >= startDate);
        }
        
        if (endDate) {
            filteredAttendance = filteredAttendance.filter(a => a.date <= endDate);
        }
        
        document.getElementById('statsDetailTitle').textContent = '已消课明细';
        
        if (filteredAttendance.length === 0) {
            document.getElementById('statsDetailContent').innerHTML = '<div class="empty-state"><p>暂无消课记录</p></div>';
            return;
        }
        
        let html = '<table class="detail-table"><thead><tr><th>日期</th><th>上课时间</th><th>学生姓名</th><th>课程名称</th><th>操作</th></tr></thead><tbody>';
        const courses = getCourses();
        
        filteredAttendance.forEach(record => {
            // 获取上课日期（课程安排的日期）
            const classDate = record.classDate || record.date;
            
            // 获取上课时间段（课程安排的时间段）
            const schedule = record.schedule || {};
            const timeSlot = schedule.startTime && schedule.endTime 
                ? `${schedule.startTime}-${schedule.endTime}` 
                : record.time;
            
            html += `
                <tr>
                    <td>${classDate}</td>
                    <td>${timeSlot}</td>
                    <td>${record.studentName}</td>
                    <td>${record.courseName}</td>
                    <td>
                        <button class="btn btn-warning btn-sm" onclick="cancelAttendanceRecord('${record.id}')">取消签到</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } else if (type === 'remaining') {
        // 未消课明细 - 显示应该上课但未签到的记录
        const today = getToday();
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        let missedClasses = [];
        const leaveRecords = getLeaveRecords();
        
        filteredCourses.forEach(course => {
            if (course.status !== 'active') return;
            
            const courseStart = course.startDate;
            const courseEnd = course.endDate || '2999-12-31';
            
            if (courseStart > today || courseEnd < today) return;
            
            // 遍历课程的所有上课日期
            const weekdays = Object.keys(course.schedule);
            weekdays.forEach(day => {
                // 计算从课程开始到今天（或结束日期）的所有该星期的日期
                let currentDate = new Date(courseStart);
                const end = new Date(Math.min(new Date(courseEnd).getTime(), new Date(today).getTime()));
                
                // 找到第一个该星期的日期
                while (currentDate.getDay() !== (parseInt(day) + 1) % 7) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // 遍历所有该星期的日期
                while (currentDate <= end) {
                    const dateStr = formatDate(currentDate);
                    
                    // 检查是否已经签到
                    const isSigned = attendance.some(a => a.courseId === course.id && a.date === dateStr);
                    
                    // 检查是否已经请假
                    const isLeave = leaveRecords.some(l => l.courseId === course.id && l.date === dateStr);
                    
                    if (!isSigned && !isLeave) {
                        missedClasses.push({
                            courseId: course.id,
                            studentName: course.studentName,
                            courseName: course.courseName,
                            date: dateStr,
                            schedule: course.schedule[day]
                        });
                    }
                    
                    currentDate.setDate(currentDate.getDate() + 7);
                }
            });
        });
        
        // 按学生姓名、课程名称、日期、上课时间排序
        missedClasses.sort((a, b) => {
            // 按学生姓名排序
            const nameCompare = a.studentName.localeCompare(b.studentName, 'zh-CN');
            if (nameCompare !== 0) return nameCompare;
            
            // 按课程名称排序
            const courseCompare = a.courseName.localeCompare(b.courseName, 'zh-CN');
            if (courseCompare !== 0) return courseCompare;
            
            // 按日期排序
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            
            // 按上课时间排序
            const timeA = a.schedule?.startTime || '';
            const timeB = b.schedule?.startTime || '';
            return timeA.localeCompare(timeB);
        });
        
        document.getElementById('statsDetailTitle').textContent = '未消课明细';
        
        if (missedClasses.length === 0) {
            document.getElementById('statsDetailContent').innerHTML = '<div class="empty-state"><p>暂无未消课记录</p></div>';
            return;
        }
        
        let html = '<table class="detail-table"><thead><tr><th>日期</th><th>上课时间</th><th>学生姓名</th><th>课程名称</th><th>状态</th><th>操作</th></tr></thead><tbody>';
        
        missedClasses.forEach(record => {
            const isPastDate = record.date < today;
            const isToday = record.date === today;
            const isBeforeClass = isToday && currentTime < record.schedule.startTime;
            const isClassOver = isToday && currentTime > record.schedule.endTime;
            
            let statusText = '';
            let statusClass = '';
            
            if (isPastDate || isClassOver) {
                statusText = '已过期';
                statusClass = 'status-expired';
            } else if (isBeforeClass) {
                statusText = '待签到';
                statusClass = 'status-pending';
            }
            
            let actionButtons = '';
            
            if (isPastDate || isClassOver) {
                actionButtons = `
                    <button class="btn btn-success btn-sm" onclick="addManualAttendance('${record.courseId}', '${record.date}')">补签</button>
                    <button class="btn btn-info btn-sm" onclick="showLeaveModalForMissed('${record.courseId}', '${record.date}')">请假</button>
                `;
            } else if (isBeforeClass) {
                actionButtons = `<button class="btn btn-info btn-sm" onclick="showLeaveModalForMissed('${record.courseId}', '${record.date}')">请假</button>`;
            } else {
                actionButtons = `
                    <button class="btn btn-success btn-sm" onclick="addManualAttendance('${record.courseId}', '${record.date}')">签到</button>
                    <button class="btn btn-info btn-sm" onclick="showLeaveModalForMissed('${record.courseId}', '${record.date}')">请假</button>
                `;
            }
            
            html += `
                <tr>
                    <td>${record.date}</td>
                    <td>${record.schedule.startTime}-${record.schedule.endTime}</td>
                    <td>${record.studentName}</td>
                    <td>${record.courseName}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        ${actionButtons}
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } else if (type === 'consumedAmount') {
        // 已消费金额明细 - 按课程显示已消耗金额
        document.getElementById('statsDetailTitle').textContent = '已消费金额明细';
        
        // 按学生名称 → 机构名称 → 课程名称排序
        filteredCourses.sort((a, b) => {
            if (a.studentName !== b.studentName) {
                return a.studentName.localeCompare(b.studentName);
            }
            const orgA = payments.find(p => p.id === a.paymentId)?.organization || '';
            const orgB = payments.find(p => p.id === b.paymentId)?.organization || '';
            if (orgA !== orgB) {
                return orgA.localeCompare(orgB);
            }
            return a.courseName.localeCompare(b.courseName);
        });
        
        let html = '<table class="detail-table"><thead><tr><th>学生姓名</th><th>机构名称</th><th>课程名称</th><th>已用课时</th><th>课时单价</th><th>已消费金额（元）</th></tr></thead><tbody>';
        let totalConsumed = 0;
        
        filteredCourses.forEach(course => {
            if (course.paymentId) {
                const payment = payments.find(p => p.id === course.paymentId);
                if (payment && payment.originalAmount && payment.originalTotalHours > 0) {
                    const unitPrice = payment.originalAmount / payment.originalTotalHours;
                    const consumed = (course.usedHours || 0) * unitPrice;
                    totalConsumed += consumed;
                    
                    html += `
                        <tr>
                            <td>${course.studentName}</td>
                            <td>${payment.organization || '-'}</td>
                            <td>${course.courseName}</td>
                            <td>${course.usedHours || 0}</td>
                            <td>¥${unitPrice.toFixed(2)}</td>
                            <td>¥${consumed.toFixed(2)}</td>
                        </tr>
                    `;
                }
            }
        });
        
        html += `<tr><td colspan="5" style="text-align:right"><strong>合计</strong></td><td><strong>¥${totalConsumed.toFixed(2)}</strong></td></tr>`;
        html += '</tbody></table>';
        document.getElementById('statsDetailContent').innerHTML = html;
    } else if (type === 'totalAmount') {
        // 总缴费金额明细 - 显示所有缴费记录
        let filteredPayments = payments;
        
        if (startDate) {
            filteredPayments = filteredPayments.filter(p => p.date >= startDate);
        }
        
        if (endDate) {
            filteredPayments = filteredPayments.filter(p => p.date <= endDate);
        }
        
        document.getElementById('statsDetailTitle').textContent = '总缴费金额明细';
        
        if (filteredPayments.length === 0) {
            document.getElementById('statsDetailContent').innerHTML = '<div class="empty-state"><p>暂无缴费记录</p></div>';
            return;
        }
        
        let html = '<table class="detail-table"><thead><tr><th>缴费日期</th><th>机构名称</th><th>课包总价（元）</th><th>课包课时</th><th>金额（元）</th></tr></thead><tbody>';
        let totalAmount = 0;
        
        filteredPayments.forEach(payment => {
            const originalAmount = payment.originalAmount !== undefined ? payment.originalAmount : payment.amount;
            totalAmount += originalAmount;
            
            html += `
                <tr>
                    <td>${payment.date}</td>
                    <td>${payment.organization || '-'}</td>
                    <td>¥${originalAmount.toFixed(2)}</td>
                    <td>${payment.originalTotalHours || payment.totalHours}</td>
                    <td>¥${payment.amount.toFixed(2)}</td>
                </tr>
            `;
        });
        
        html += `<tr><td colspan="4" style="text-align:right"><strong>合计</strong></td><td><strong>¥${totalAmount.toFixed(2)}</strong></td></tr>`;
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
    
    const newAttendance = {
        id: generateId(),
        courseId,
        studentName: course.studentName,
        courseName: course.courseName,
        date: date,
        time: '补签'
    };
    
    attendance.push(newAttendance);
    saveAttendance(attendance);
    
    // 更新课程和缴费的已用课时
    course.usedHours = (course.usedHours || 0) + 1;
    saveCourses(courses);
    
    if (course.paymentId) {
        const payment = payments.find(p => p.id === course.paymentId);
        if (payment) {
            payment.usedHours += 1;
            savePayments(payments);
        }
    }
    
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
    initData();
    renderStudentSelector();
    updatePaymentFilters();
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
    
    // 设置课表日期范围为本周
    const scheduleStartDateInput = document.getElementById('scheduleStartDate');
    const scheduleEndDateInput = document.getElementById('scheduleEndDate');
    if (scheduleStartDateInput) scheduleStartDateInput.value = getWeekStart();
    if (scheduleEndDateInput) scheduleEndDateInput.value = getWeekEnd();
    
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
    
    // 默认显示今日签到页
    switchTab('attendance');
    renderStats();
    renderAttendance();
}

// 初始化数据
function initData() {
    const dataVersion = 'v9';
    
    // 如果数据版本不同，重新初始化所有数据
    if (localStorage.getItem('dataVersion') !== dataVersion) {
        localStorage.clear();
        localStorage.setItem('dataVersion', dataVersion);
        
        // 设置学生列表（包含新增的学生G和学生H）
        localStorage.setItem('students', JSON.stringify(['学生A', '学生B', '学生C', '学生D', '学生E', '学生F', '学生G', '学生H']));
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