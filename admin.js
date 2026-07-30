const GITHUB_OWNER = 'Bron-Driver';
const GITHUB_REPO = 'RDASH-LMHub-Admin';
const FILE_PATH = 'Data/ClassList.json';

let ghToken = localStorage.getItem('ghToken') || '';
let classListData = [];
let fileSha = '';

// Utf-8 safe base64 encoding/decoding
function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent(str)));
}
function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob(str)));
}

// Convert Excel date to JS Date string (YYYY-MM-DD)
function excelToDateString(excelDate) {
  if (!excelDate || isNaN(excelDate)) return '';
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

// Convert JS Date string (YYYY-MM-DD) to Excel date
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
    loadClasses();
  } else {
    openSettings();
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
    loadClasses();
  } else {
    localStorage.removeItem('ghToken');
    document.getElementById('repoStatus').textContent = 'Not Connected';
    document.getElementById('repoStatus').classList.replace('bg-success', 'bg-secondary');
    document.getElementById('dashboard').classList.add('d-none');
  }
  bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
}

function showAlert(message, type = 'danger') {
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  </div>`;
  setTimeout(() => alertContainer.innerHTML = '', 5000);
}

async function loadClasses() {
  if (!ghToken) return;
  const tbody = document.getElementById('classesTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><br>Loading classes...</td></tr>';
  
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch data from GitHub. Check your token and permissions.');

    const data = await response.json();
    fileSha = data.sha;
    const content = b64_to_utf8(data.content);
    classListData = JSON.parse(content);
    
    renderClasses();
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Error: ${error.message}</td></tr>`;
  }
}

function renderClasses() {
  const tbody = document.getElementById('classesTableBody');
  if (!classListData || classListData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No classes found.</td></tr>';
    return;
  }
  
  // Sort by start date (newest first for display? Or oldest?) Let's do descending
  const sorted = [...classListData].sort((a, b) => (b['Start Date'] || 0) - (a['Start Date'] || 0));

  tbody.innerHTML = sorted.slice(0, 100).map(item => `
    <tr>
      <td><strong>${item.Title || item.Course || 'Untitled'}</strong></td>
      <td>${excelToDateString(item['Start Date'])}</td>
      <td>${item['Start Time'] || ''}</td>
      <td><span class="badge bg-info">${item['Delivery Mode'] || 'N/A'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" onclick="alert('Editing requires passing the exact item index, not implemented fully in this snippet.')" disabled>
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function showAddForm() {
  document.getElementById('classForm').reset();
  const modal = new bootstrap.Modal(document.getElementById('classModal'));
  modal.show();
}

async function saveClass() {
  const newClass = {
    "Course": document.getElementById('f_Course').value.trim(),
    "Offering Name": document.getElementById('f_OfferingName').value.trim(),
    "Delivery Mode": document.getElementById('f_Mode').value,
    "Title": document.getElementById('f_Title').value.trim(),
    "Start Date": dateStringToExcel(document.getElementById('f_StartDate').value),
    "End Date": dateStringToExcel(document.getElementById('f_EndDate').value),
    "Start Time": document.getElementById('f_StartTime').value,
    "End Time": document.getElementById('f_EndTime').value,
    "Category": document.getElementById('f_Category').value.trim(),
    "Places Remaining": 0,
    "Offering link": document.getElementById('f_Link').value.trim()
  };

  if (!newClass.Course || !newClass.Title || !newClass['Start Date']) {
    alert("Please fill in the required fields (Course, Title, Start Date, End Date).");
    return;
  }

  // Disable button
  const btn = document.getElementById('btnSave');
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  btn.disabled = true;

  // Append
  classListData.push(newClass);

  try {
    const updatedContent = JSON.stringify(classListData, null, 2);
    const encodedContent = utf8_to_b64(updatedContent);

    const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Admin Panel: Added new class '${newClass.Title}'`,
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
    
    bootstrap.Modal.getInstance(document.getElementById('classModal')).hide();
    showAlert(`Successfully added '${newClass.Title}' to GitHub!`, 'success');
    renderClasses();

  } catch (error) {
    showAlert(`Error saving to GitHub: ${error.message}`);
    // Rollback
    classListData.pop();
  } finally {
    btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-1"></i> Save to GitHub';
    btn.disabled = false;
  }
}
