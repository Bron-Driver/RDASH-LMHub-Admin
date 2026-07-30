const GITHUB_OWNER = 'NHS-ESR-IAs';
const GITHUB_REPO = 'RDASH-LMHub';

let ghToken = localStorage.getItem('ghToken') || '';
let currentData = [];
let fileSha = '';
let currentFile = 'ClassList.json'; // Default
let editingIndex = null;

// Utf-8 safe base64 encoding/decoding
function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}
function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

// Date Conversions
function excelToDateString(excelDate) {
  if (!excelDate || isNaN(excelDate)) return '';
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}
function dateStringToExcel(dateString) {
  if (!dateString) return 0;
  const date = new Date(dateString);
  return Math.floor(date.getTime() / 86400000) + 25569;
}

document.addEventListener('DOMContentLoaded', () => {
  if (ghToken) {
    document.getElementById('repoStatus').textContent = 'Connected';
    document.getElementById('repoStatus').classList.replace('bg-secondary', 'bg-success');
    document.getElementById('dashboard').classList.remove('d-none');
    document.getElementById('setupPrompt').classList.add('d-none');
    loadData();
  } else {
    document.getElementById('setupPrompt').classList.remove('d-none');
  }
});

function openSettings() {
  document.getElementById('ghToken').value = ghToken;
  const modal = new bootstrap.Modal(document.getElementById('settingsModal'));
  modal.show();
}

function saveSettings() {
  ghToken = document.getElementById('ghToken').value.trim();
  if (ghToken) {
    localStorage.setItem('ghToken', ghToken);
    document.getElementById('repoStatus').textContent = 'Connected';
    document.getElementById('repoStatus').classList.replace('bg-secondary', 'bg-success');
    document.getElementById('dashboard').classList.remove('d-none');
    document.getElementById('setupPrompt').classList.add('d-none');
    loadData();
  } else {
    localStorage.removeItem('ghToken');
    document.getElementById('repoStatus').textContent = 'Not Connected';
    document.getElementById('repoStatus').classList.replace('bg-success', 'bg-secondary');
    document.getElementById('dashboard').classList.add('d-none');
    document.getElementById('setupPrompt').classList.remove('d-none');
  }
  bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
}

function showAlert(message, type = 'danger') {
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
  setTimeout(() => alertContainer.innerHTML = '', 5000);
}

function switchTab(filename, title) {
  currentFile = filename;
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('searchInput').value = '';
  
  // Update sidebar active state
  document.querySelectorAll('#sidebarNav .nav-link').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');

  loadData();
}

async function loadData() {
  if (!ghToken) return;
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><br>Loading data...</td></tr>';
  
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/Data/${currentFile}?ref=main`, {
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch data from GitHub. Check your token.');

    const data = await response.json();
    fileSha = data.sha;
    const content = b64_to_utf8(data.content);
    currentData = JSON.parse(content);
    
    renderTable();
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${error.message}</td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  const thead = document.getElementById('tableHeader');
  const query = document.getElementById('searchInput').value.toLowerCase();

  let filtered = currentData;
  if (query) {
    filtered = currentData.filter(item => JSON.stringify(item).toLowerCase().includes(query));
  }

  if (currentFile === 'ClassList.json') {
    thead.innerHTML = `<tr><th>Title</th><th>Date</th><th>Time</th><th>Mode</th><th class="text-end">Actions</th></tr>`;
    
    // Sort classes by date descending
    filtered.sort((a, b) => (b['Start Date'] || 0) - (a['Start Date'] || 0));

    tbody.innerHTML = filtered.map((item) => {
      // Find original index for editing
      const originalIndex = currentData.indexOf(item);
      return `
        <tr>
          <td><strong>${item.Title || item.Course || 'Untitled'}</strong></td>
          <td>${excelToDateString(item['Start Date'])}</td>
          <td>${item['Start Time'] || ''}</td>
          <td><span class="badge bg-info">${item['Delivery Mode'] || 'N/A'}</span></td>
          <td class="text-end">
            <button class="btn btn-sm btn-light text-primary action-btn me-1" onclick="editItem(${originalIndex})" title="Edit"><i class="bi bi-pencil-fill"></i></button>
            <button class="btn btn-sm btn-light text-danger action-btn" onclick="deleteItem(${originalIndex})" title="Delete"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>
      `;
    }).join('');

  } else {
    // Courses, Video, QI
    thead.innerHTML = `<tr><th>Course Name</th><th>Target Audience</th><th>Trainer</th><th class="text-end">Actions</th></tr>`;
    
    tbody.innerHTML = filtered.map((item) => {
      const originalIndex = currentData.indexOf(item);
      return `
        <tr>
          <td><strong>${item.Course || 'Untitled'}</strong></td>
          <td>${item.TargetAudience || ''}</td>
          <td>${item.Trainer || ''}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-light text-primary action-btn me-1" onclick="editItem(${originalIndex})" title="Edit"><i class="bi bi-pencil-fill"></i></button>
            <button class="btn btn-sm btn-light text-danger action-btn" onclick="deleteItem(${originalIndex})" title="Delete"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No records found.</td></tr>';
  }
}

function filterTable() {
  renderTable();
}

function showAddForm() {
  editingIndex = null;
  if (currentFile === 'ClassList.json') {
    document.getElementById('classForm').reset();
    document.getElementById('classModalTitle').textContent = 'Add New Class';
    new bootstrap.Modal(document.getElementById('classModal')).show();
  } else {
    document.getElementById('courseForm').reset();
    document.getElementById('courseModalTitle').textContent = 'Add New Item';
    new bootstrap.Modal(document.getElementById('courseModal')).show();
  }
}

function editItem(index) {
  editingIndex = index;
  const item = currentData[index];

  if (currentFile === 'ClassList.json') {
    document.getElementById('fc_Course').value = item['Course'] || '';
    document.getElementById('fc_Title').value = item['Title'] || '';
    document.getElementById('fc_OfferingName').value = item['Offering Name'] || '';
    document.getElementById('fc_Mode').value = item['Delivery Mode'] || 'Online';
    document.getElementById('fc_StartDate').value = excelToDateString(item['Start Date']);
    document.getElementById('fc_EndDate').value = excelToDateString(item['End Date']);
    document.getElementById('fc_StartTime').value = item['Start Time'] || '';
    document.getElementById('fc_EndTime').value = item['End Time'] || '';
    document.getElementById('fc_Category').value = item['Category'] || '';
    document.getElementById('fc_Link').value = item['Offering link'] || '';

    document.getElementById('classModalTitle').textContent = 'Edit Class';
    new bootstrap.Modal(document.getElementById('classModal')).show();
  } else {
    document.getElementById('f_Course').value = item['Course'] || '';
    document.getElementById('f_Description').value = item['Description'] || '';
    document.getElementById('f_TargetAudience').value = item['TargetAudience'] || '';
    document.getElementById('f_Trainer').value = item['Trainer'] || '';
    document.getElementById('f_Venue').value = item['Venue'] || '';
    document.getElementById('f_CourseLink').value = item['CourseLink'] || '';

    document.getElementById('courseModalTitle').textContent = 'Edit Item';
    new bootstrap.Modal(document.getElementById('courseModal')).show();
  }
}

async function deleteItem(index) {
  if (!confirm('Are you sure you want to delete this item? This action will immediately update the live site.')) return;
  
  const deletedItemName = currentFile === 'ClassList.json' ? currentData[index].Title : currentData[index].Course;
  currentData.splice(index, 1);
  
  await pushToGitHub(`Deleted '${deletedItemName}' from ${currentFile}`);
}

async function saveItem() {
  let newItem = {};
  let btnId = '';

  if (currentFile === 'ClassList.json') {
    newItem = {
      "Course": document.getElementById('fc_Course').value.trim(),
      "Offering Name": document.getElementById('fc_OfferingName').value.trim(),
      "Delivery Mode": document.getElementById('fc_Mode').value,
      "Title": document.getElementById('fc_Title').value.trim(),
      "Start Date": dateStringToExcel(document.getElementById('fc_StartDate').value),
      "End Date": dateStringToExcel(document.getElementById('fc_EndDate').value),
      "Start Time": document.getElementById('fc_StartTime').value,
      "End Time": document.getElementById('fc_EndTime').value,
      "Category": document.getElementById('fc_Category').value.trim(),
      "Places Remaining": 0,
      "Offering link": document.getElementById('fc_Link').value.trim()
    };
    if (!newItem.Course || !newItem.Title || !newItem['Start Date']) {
      alert("Please fill in the required fields."); return;
    }
    btnId = 'btnSaveClass';
  } else {
    newItem = {
      "Course": document.getElementById('f_Course').value.trim(),
      "Description": document.getElementById('f_Description').value.trim(),
      "TargetAudience": document.getElementById('f_TargetAudience').value.trim(),
      "Trainer": document.getElementById('f_Trainer').value.trim(),
      "Venue": document.getElementById('f_Venue').value.trim(),
      "CourseLink": document.getElementById('f_CourseLink').value.trim()
    };
    if (!newItem.Course) {
      alert("Please fill in the Course Name."); return;
    }
    btnId = 'btnSaveCourse';
  }

  // Backup state in case of failure
  const originalDataStr = JSON.stringify(currentData);

  if (editingIndex !== null) {
    currentData[editingIndex] = newItem;
  } else {
    currentData.push(newItem);
  }

  const btn = document.getElementById(btnId);
  const originalBtnHtml = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  btn.disabled = true;

  const success = await pushToGitHub(`Admin Panel: ${editingIndex !== null ? 'Edited' : 'Added'} '${newItem.Title || newItem.Course}' in ${currentFile}`);
  
  if (!success) {
    // Rollback
    currentData = JSON.parse(originalDataStr);
  } else {
    // Hide modal on success
    const modalId = currentFile === 'ClassList.json' ? 'classModal' : 'courseModal';
    bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
  }

  btn.innerHTML = originalBtnHtml;
  btn.disabled = false;
}

async function pushToGitHub(commitMessage) {
  try {
    const updatedContent = JSON.stringify(currentData, null, 2);
    const encodedContent = utf8_to_b64(updatedContent);

    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/Data/${currentFile}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        content: encodedContent,
        sha: fileSha,
        branch: 'main'
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Failed to save to GitHub.');
    }

    // Refresh file SHA
    const data = await response.json();
    fileSha = data.content.sha;
    
    showAlert(`Successfully synced changes to GitHub!`, 'success');
    renderTable();
    return true;

  } catch (error) {
    showAlert(`Error saving to GitHub: ${error.message}`);
    return false;
  }
}
