const USERS_KEY = "ccms_users";
const COMPLAINTS_KEY = "ccms_complaints";
const SESSION_KEY = "ccms_current_user";

const seedUsers = [
  {name:"Student", email:"student@campus.com", pass:"1234", role:"student", dept:"CSE", className:"A", year:"2"},
  {name:"HoS", email:"hos@campus.com", pass:"1234", role:"hos", dept:"CSE", className:"A", year:"2"},
  {name:"HOD", email:"hod@campus.com", pass:"1234", role:"hod", dept:"CSE"},
  {name:"Admin", email:"admin@campus.com", pass:"1234", role:"admin"},
  {name:"Worker", email:"worker@campus.com", pass:"1234", role:"worker", workerType:"Electrician"}
];

function getUsers(){
  let users = JSON.parse(localStorage.getItem(USERS_KEY));
  if(!users){
    localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
    users = seedUsers;
  }
  return users;
}

function saveUsers(users){ localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getComplaints(){ return JSON.parse(localStorage.getItem(COMPLAINTS_KEY)) || []; }
function saveComplaints(list){ localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(list)); }
function currentUser(){ return JSON.parse(localStorage.getItem(SESSION_KEY)); }

function showAuthTab(tab){
  document.getElementById("loginForm").classList.toggle("hidden", tab !== "login");
  document.getElementById("registerForm").classList.toggle("hidden", tab !== "register");
  document.getElementById("loginTab").classList.toggle("active", tab === "login");
  document.getElementById("registerTab").classList.toggle("active", tab === "register");
}

function toggleRegistrationFields(){
  const role = document.getElementById("role").value;
  document.querySelectorAll(".role-field").forEach(field=>{
    const roles = field.dataset.roles.split(",");
    field.classList.toggle("hidden", !roles.includes(role));
  });
}

function register(event){
  event.preventDefault();
  const users = getUsers();
  const email = document.getElementById("remail").value.trim().toLowerCase();

  if(users.some(u => u.email === email)){
    alert("Email already registered");
    return;
  }

  const user = {
    name: document.getElementById("rname").value.trim(),
    email,
    pass: document.getElementById("rpass").value,
    role: document.getElementById("role").value,
    dept: document.getElementById("dept").value,
    className: document.getElementById("class").value,
    year: document.getElementById("year").value,
    workerType: document.getElementById("workerType").value
  };

  users.push(user);
  saveUsers(users);
  alert("Registration successful. Please login.");
  showAuthTab("login");
}

function login(event){
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const pass = document.getElementById("loginPass").value;
  const user = getUsers().find(u => u.email === email && u.pass === pass);

  if(!user){
    alert("Invalid login credentials");
    return;
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  window.location.href = "dashboard.html";
}

function logout(){
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "index.html";
}

function goComplaint(){ window.location.href = "complaint.html"; }

function syncSuggestedWorker(){
  const category = document.getElementById("category").value;
  const map = {
    "Smart Board":"IT Support",
    "Lab Equipment":"Lab Assistant",
    "Plumbing":"Plumber",
    "Electrical":"Electrician",
    "Classroom Maintenance":"Maintenance",
    "Internet / Network":"IT Support"
  };
  document.getElementById("suggestedWorkerText").textContent =
    category ? `This complaint may be assigned to: ${map[category]}` : "Select a category to view the likely worker assignment.";
}

function addComplaint(event){
  event.preventDefault();
  const user = currentUser();
  if(!user || user.role !== "student"){
    alert("Only students can raise complaints");
    return;
  }

  const category = document.getElementById("category").value;
  const workerMap = {
    "Smart Board":"IT Support",
    "Lab Equipment":"Lab Assistant",
    "Plumbing":"Plumber",
    "Electrical":"Electrician",
    "Classroom Maintenance":"Maintenance",
    "Internet / Network":"IT Support"
  };

  const complaint = {
    id: Date.now(),
    title: document.getElementById("title").value.trim(),
    category,
    location: document.getElementById("location").value.trim(),
    desc: document.getElementById("desc").value.trim(),
    studentEmail: user.email,
    studentName: user.name,
    dept: user.dept,
    className: user.className,
    year: user.year,
    status: "Pending with HoS",
    suggestedWorker: workerMap[category],
    assignedWorker: "",
    createdAt: new Date().toLocaleString()
  };

  const list = getComplaints();
  list.push(complaint);
  saveComplaints(list);
  alert("Complaint submitted successfully");
  window.location.href = "dashboard.html";
}

function visibleComplaints(user, complaints){
  if(user.role === "student") return complaints.filter(c => c.studentEmail === user.email);
  if(user.role === "hos") return complaints.filter(c => c.dept === user.dept && c.className === user.className);
  if(user.role === "hod") return complaints.filter(c => c.dept === user.dept && c.status.includes("HOD"));
  if(user.role === "admin") return complaints.filter(c => c.status.includes("Admin") || c.status.includes("Assigned") || c.status.includes("Resolved"));
  if(user.role === "worker") return complaints.filter(c => c.assignedWorker === user.workerType || c.suggestedWorker === user.workerType);
  return [];
}

function updateStatus(id, status, worker=""){
  const list = getComplaints();
  const item = list.find(c => c.id === id);
  if(!item) return;
  item.status = status;
  if(worker) item.assignedWorker = worker;
  saveComplaints(list);
  loadDashboard();
}

function renderActions(user, c){
  if(user.role === "hos" && c.status === "Pending with HoS"){
    return `<button class="primary-btn" onclick="updateStatus(${c.id}, 'Pending with HOD')">Approve to HOD</button>
            <button class="ghost-btn" onclick="updateStatus(${c.id}, 'Rejected')">Reject</button>`;
  }
  if(user.role === "hod" && c.status === "Pending with HOD"){
    return `<button class="primary-btn" onclick="updateStatus(${c.id}, 'Pending with Admin')">Approve to Admin</button>
            <button class="ghost-btn" onclick="updateStatus(${c.id}, 'Rejected')">Reject</button>`;
  }
  if(user.role === "admin" && c.status === "Pending with Admin"){
    return `<button class="primary-btn" onclick="updateStatus(${c.id}, 'Assigned to Worker', '${c.suggestedWorker}')">Assign ${c.suggestedWorker}</button>`;
  }
  if(user.role === "worker" && c.status === "Assigned to Worker"){
    return `<button class="primary-btn" onclick="updateStatus(${c.id}, 'Resolved')">Mark Resolved</button>`;
  }
  return "";
}

function loadDashboard(){
  const user = currentUser();
  if(!user){
    window.location.href = "index.html";
    return;
  }

  document.getElementById("dashboardTitle").textContent = `${user.role.toUpperCase()} Dashboard`;
  document.getElementById("dashboardSubtitle").textContent = `Logged in as ${user.name} (${user.email})`;
  document.getElementById("raiseComplaintBtn").classList.toggle("hidden", user.role !== "student");

  const complaints = getComplaints();
  const visible = visibleComplaints(user, complaints);

  document.getElementById("statsGrid").innerHTML = `
    <div class="card stat-card"><p>Total</p><b>${visible.length}</b></div>
    <div class="card stat-card"><p>Pending</p><b>${visible.filter(c=>c.status.includes("Pending")).length}</b></div>
    <div class="card stat-card"><p>Assigned</p><b>${visible.filter(c=>c.status.includes("Assigned")).length}</b></div>
    <div class="card stat-card"><p>Resolved</p><b>${visible.filter(c=>c.status === "Resolved").length}</b></div>
  `;

  document.getElementById("filterSummary").textContent = `Showing ${visible.length} complaint(s)`;
  document.getElementById("emptyState").classList.toggle("hidden", visible.length !== 0);

  document.getElementById("complaintList").innerHTML = visible.map(c => `
    <article class="complaint-item">
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <div class="complaint-meta">
        <span class="badge">${c.category}</span>
        <span class="badge">${c.location}</span>
        <span class="badge ${c.status.toLowerCase().split(" ")[0]}">${c.status}</span>
      </div>
      <p><b>Student:</b> ${c.studentName} | <b>Dept:</b> ${c.dept} | <b>Class:</b> ${c.className} | <b>Year:</b> ${c.year}</p>
      <p><b>Suggested Worker:</b> ${c.suggestedWorker} ${c.assignedWorker ? "| <b>Assigned:</b> " + c.assignedWorker : ""}</p>
      <small>Created: ${c.createdAt}</small>
      <div class="action-row">${renderActions(user, c)}</div>
    </article>
  `).join("");

  if(user.role === "admin"){
    document.getElementById("adminUsersSection").classList.remove("hidden");
    document.getElementById("userDirectory").innerHTML = getUsers().map(u => `
      <div class="user-card">
        <b>${u.name}</b>
        <p>${u.email}</p>
        <span class="badge">${u.role}</span>
      </div>
    `).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  getUsers();
  const page = document.body.dataset.page;
  if(page === "auth") toggleRegistrationFields();
  if(page === "dashboard") loadDashboard();
  if(page === "complaint") {
    const user = currentUser();
    if(!user) window.location.href = "index.html";
    if(user && user.role !== "student") window.location.href = "dashboard.html";
  }
});
