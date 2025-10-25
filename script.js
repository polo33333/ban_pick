const socket = io();
let myRoom = null;
let myRole = null;
let currentRoomState = null; // Biến lưu trạng thái phòng hiện tại
const logEl = document.getElementById("log");
const playerNameInput = document.getElementById("playerName");
const loginViewEl = document.getElementById("login-view");
const draftViewEl = document.getElementById("draft-view");
const champSelectionControlsEl = document.getElementById("champ-selection-controls");
const currentTurnEl = document.getElementById("current-turn");
const roomIdInput = document.getElementById("roomId");
const roleSelect = document.getElementById("role");
const champSearchInput = document.getElementById("champ-search");
const champGridEl = document.getElementById("champ-grid");
const clearSearchBtn = document.getElementById("clear-search-btn");
const lockInButton = document.getElementById("lock-in-button");

const banSlotsCount = 2;
const pickSlotsCount = 9;
const blueBansEl = document.getElementById("blue-bans");
const redBansEl = document.getElementById("red-bans");
// Thay thế các div cũ bằng các div cho từng phase
const bluePicksP1El = document.getElementById("blue-picks-p1");
const bluePicksP2El = document.getElementById("blue-picks-p2");
const redPicksP1El = document.getElementById("red-picks-p1");
const redPicksP2El = document.getElementById("red-picks-p2");

// --- Pre-Draft Selection Elements ---
const preDraftViewEl = document.getElementById("pre-draft-selection-view");
const teamsContainerEl = document.getElementById("teams-container");
const confirmPreDraftBtn = document.getElementById("confirm-pre-draft-button");
const preDraftMyGridEl = document.getElementById("pre-draft-my-champ-grid");
const preDraftMySelectionsEl = document.getElementById("pre-draft-my-selections");
const preDraftPlayerNameEl = document.getElementById("pre-draft-player-name");

let myPreDraftSelection = [];
const p1PreDraftDisplayEl = document.getElementById("p1-pre-draft-display");
const p2PreDraftDisplayEl = document.getElementById("p2-pre-draft-display");

for (let i = 0; i < banSlotsCount; i++) {
  const b = document.createElement("div");
  b.className = "slot blue"; blueBansEl.appendChild(b);
  const r = document.createElement("div");
  r.className = "slot red"; redBansEl.appendChild(r);
}
for (let i = 0; i < pickSlotsCount; i++) {
  // Tạo slot cho cả 2 phase, nhưng chỉ điền vào phase 1 ban đầu
  const b = document.createElement("div");
  b.className = "slot blue";
  const r = document.createElement("div");
  r.className = "slot red";
  // 4 slot đầu cho phase 1, 5 slot sau cho phase 2
  if (i < 4) { bluePicksP1El.appendChild(b); redPicksP1El.appendChild(r); }
  else { bluePicksP2El.appendChild(b); redPicksP2El.appendChild(r); }
}

//function log(msg) { logEl.innerText += msg + "\n"; }

// --- Màu sắc cho các element ---
const elementColors = {
  1: '#a0e9ff', // Glacio (Băng) - Xanh nhạt
  2: '#ff9999', // Fusion (Nhiệt) - Đỏ
  3: '#e3b3ff', // Electro (Dẫn) - Tím
  4: '#99ffd6', // Aero (Khi) - Xanh lục
  5: '#fff3a0', // Spectro (Quang) - Vàng
  6: '#ad6f30'  // Havoc (Tán xạ)
};
// --- Logic tìm kiếm và hiển thị tướng ---
let characters = {};
let uniqueCharacters = [];
let preSelectedChamp = null;
let remotePreSelectedChamp = null;

async function loadCharacters() {
  try {
    const response = await fetch('/characters');
    const rawCharacters = await response.json();
    // Lọc bỏ các tướng trùng lặp dựa trên tên 'en'
    const seen = new Set();
    uniqueCharacters = Object.values(rawCharacters).filter(char => {
      const duplicate = seen.has(char.en);
      seen.add(char.en);
      return !duplicate;
    });

    // Sắp xếp danh sách tướng theo thứ tự ABC dựa trên tên 'en'
    uniqueCharacters.sort((a, b) => a.en.localeCompare(b.en));

    characters = uniqueCharacters.reduce((obj, char) => {
      obj[char.en] = char;
      return obj;
    }, {});
    renderChampionGrid(uniqueCharacters);
    console.log("Characters loaded successfully.");
  } catch (error) {
    console.error("Failed to load characters:", error);
  }
}

function preloadSplashArts(charList) {
  console.log("Preloading splash arts...");
  charList.forEach(char => {
    if (char.background) {
      const img = new Image();
      img.src = char.background;
    }
  });
  console.log("Splash art preloading initiated.");
}

function renderChampionGrid(charList) {
  champGridEl.innerHTML = "";
  charList.forEach(char => {
    const item = document.createElement('div');
    item.className = 'champ-item';
    item.dataset.name = char.en;
    item.innerHTML = `<img src="${char.icon}" alt="${char.en}" title="${char.en}"><div class="grid-champ-name">${char.en}</div>`;
    item.onclick = () => { // Sửa lỗi so sánh myRole
      if (item.classList.contains('disabled') || !currentRoomState?.nextTurn || currentRoomState.paused || currentRoomState.nextTurn.team !== socket.id) return;

      // Bỏ chọn nháp cũ
      document.querySelectorAll('.champ-item.pre-selected').forEach(el => el.classList.remove('pre-selected'));

      // Chọn nháp mới
      item.classList.add('pre-selected');
      preSelectedChamp = char;
      lockInButton.disabled = false;

      socket.emit("pre-select-champ", { roomId: myRoom, champ: char.en });
      // Cập nhật splash art ngay lập tức
      const splashContainer = document.getElementById('splash-art-container');
      splashContainer.style.display = 'block';
      updateSplashArt(char.en);
    };
    champGridEl.appendChild(item);
  });
  // Bắt đầu tải trước ảnh nền sau khi render lưới tướng
  preloadSplashArts(charList);
}

champSearchInput.oninput = () => {
  const query = champSearchInput.value.toLowerCase();
  if (query.length > 0) {
    clearSearchBtn.style.display = 'block';
  } else {
    clearSearchBtn.style.display = 'none';
  }
  const filtered = uniqueCharacters.filter(char => char.en.toLowerCase().includes(query));
  renderChampionGrid(filtered);
};

clearSearchBtn.onclick = () => {
  champSearchInput.value = '';
  // Kích hoạt sự kiện oninput để cập nhật lại lưới tướng và ẩn nút clear
  const event = new Event('input', { bubbles: true });
  champSearchInput.dispatchEvent(event);
}

lockInButton.onclick = () => {
  if (!preSelectedChamp || !myRoom) return;
  socket.emit("select-champ", { roomId: myRoom, champ: preSelectedChamp.en });
  lockInButton.disabled = true;
  socket.emit("pre-select-champ", { roomId: myRoom, champ: null }); // Gửi tín hiệu xóa chọn nháp
  preSelectedChamp = null;
};

// --- Logic tạo Room ID ngẫu nhiên ---
function generateRandomId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function truncateName(name, maxLength = 6) {
  if (name && name.length > maxLength) {
    return name.substring(0, maxLength) + '...';
  }
  return name;
}

const playerNameContainer = document.getElementById("playerName-container");
roleSelect.onchange = () => {
  if (roleSelect.value === "host") {
    roomIdInput.value = generateRandomId();
    roomIdInput.readOnly = true;
    playerNameContainer.style.display = 'none';
  } else {
    roomIdInput.value = "";
    roomIdInput.readOnly = false;
    playerNameContainer.style.display = 'block';
  }
};

document.getElementById("join").onclick = () => {
  myRoom = document.getElementById("roomId").value;
  myRole = document.getElementById("role").value;
  let joinData = { roomId: myRoom, role: myRole };
  if (myRole === 'player') {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
      alert('Vui lòng nhập tên người chơi!');
      return;
    }
    joinData.playerName = playerName;
  }
  socket.emit("join-room", joinData);
  lockInButton.style.backgroundColor = 'green';
};

window.chooseFirst = (team) => {
  if (!myRoom) return;
  socket.emit("choose-first", { roomId: myRoom, team });
};

// --- Host control functions ---
window.closeRoom = () => {
  if (!myRoom || myRole !== 'host') return;
  if (confirm('Are you sure you want to close this room?')) {
    socket.emit('close-room', { roomId: myRoom });
  }
};
window.togglePause = () => {
  if (!myRoom || myRole !== 'host') return;
  socket.emit('toggle-pause', { roomId: myRoom });
};
window.setCountdown = () => {
  if (!myRoom || myRole !== 'host') return;
  const time = document.getElementById('countdown-input').value;
  socket.emit('set-countdown', { roomId: myRoom, time: parseInt(time, 10) });
};
window.kickPlayer = (team) => {
  if (!myRoom || myRole !== 'host') return;
  socket.emit('kick-player', { roomId: myRoom, playerIdToKick: team }); // Gửi playerId thay vì team
};
// Tự động tạo ID cho host khi tải trang
roleSelect.dispatchEvent(new Event('change'));

// Tải dữ liệu tướng khi trang được load
loadCharacters();

// --- Pre-Draft Logic ---
confirmPreDraftBtn.onclick = () => {
  socket.emit("confirm-pre-draft", { roomId: myRoom });
};
socket.on("room-state", (room) => {
  const turnChanged = currentRoomState?.currentTurn !== room.currentTurn;
  // Hiển thị draft view và ẩn login view khi nhận được state
  loginViewEl.style.display = 'none';
  draftViewEl.style.display = 'block';

  currentRoomState = room; // Cập nhật trạng thái phòng mới nhất
  const hostControlsToggle = document.getElementById("host-controls-toggle");
  if (socket.id === room.hostId) {
    hostControlsToggle.classList.remove('d-none');
  } else {
    hostControlsToggle.classList.add('d-none');
  }

  // Cập nhật nút kick player cho host
  const kickButtonsContainer = document.getElementById("kick-buttons-container");
  if (myRole === 'host' && room.playerOrder && room.playerOrder.length > 0) {
    kickButtonsContainer.innerHTML = ""; // Xóa các nút cũ
    const playerIds = room.playerOrder;

    playerIds.forEach((id, index) => {
      const player = room.playerHistory[id];
      if (player && room.players[id]) { // Chỉ hiển thị nút kick cho player đang connected
        const btn = document.createElement('button');
        const btnClass = index === 0 ? 'btn-primary' : 'btn-danger';
        btn.className = `btn ${btnClass} w-100`;
        btn.innerText = `Kick ${truncateName(player.name)}`;
        btn.onclick = () => {
          if (confirm(`Bạn có chắc muốn kick ${truncateName(player.name)}?`)) {
            kickPlayer(id);
          }
        };
        kickButtonsContainer.appendChild(btn);
      }
    });
  }

  // Cập nhật nút chọn player đi trước cho host
  const preDraftControls = document.getElementById("pre-draft-controls");
  if (myRole === 'host' && room.players && Object.keys(room.players).length === 2 && !room.nextTurn && room.actions.length === 0) {
    preDraftControls.style.display = "flex";
    preDraftControls.innerHTML = ""; // Xóa các nút cũ
    const playerNames = Object.values(room.players).map(p => p.name);
    const playerIds = Object.keys(room.players);

    const btn1 = document.createElement('button');
    btn1.className = "btn btn-outline-primary";
    btn1.innerText = `${truncateName(playerNames[0])} đi trước`;
    btn1.onclick = () => chooseFirst(playerIds[0]);
    preDraftControls.appendChild(btn1);

    const btn2 = document.createElement('button');
    btn2.className = "btn btn-outline-danger";
    btn2.innerText = `${truncateName(playerNames[1])} đi trước`;
    btn2.onclick = () => chooseFirst(playerIds[1]);
    preDraftControls.appendChild(btn2);

  } else {
    preDraftControls.style.display = "none";
  }

  // --- Logic hiển thị Pre-Draft Selection ---
  const isPreDraftPhase = room.state === 'pre-draft-selection';
  // Hiển thị pre-draft nếu: đang trong phase pre-draft, user là player, VÀ user chưa sẵn sàng.
  const shouldShowPreDraft = isPreDraftPhase && myRole === 'player' && !room.preDraftReady?.[socket.id];

  if (shouldShowPreDraft) {
    preDraftViewEl.style.display = 'block';
    teamsContainerEl.style.display = 'none'; // Ẩn giao diện draft chính
    champSelectionControlsEl.style.display = 'none'; // Ẩn phần chọn tướng chính
    // Nếu là host, chỉ xem
    if (myRole === 'host') {
      confirmPreDraftBtn.style.display = 'none';
    }

    // Cập nhật tên người chơi của chính mình
    const myPlayerData = room.players[socket.id];
    if (myPlayerData) {
      preDraftPlayerNameEl.innerText = myPlayerData.name;
    }

    // Render lưới tướng cho người chơi local
    const localSelections = room.preDraftSelections?.[socket.id] || [];
    // Không cần opponentSelections nữa vì không hiển thị
    renderPreDraftChampionGrid(preDraftMyGridEl, localSelections, []);

    // Cập nhật hiển thị các tướng đã chọn
    updatePreDraftSelections(localSelections, preDraftMySelectionsEl);


    // Cập nhật trạng thái nút xác nhận
    if (room.preDraftReady?.[socket.id]) {
      confirmPreDraftBtn.disabled = true;
      confirmPreDraftBtn.innerText = 'Đã xác nhận';
      confirmPreDraftBtn.classList.remove('btn-success');
      confirmPreDraftBtn.classList.add('btn-secondary');
    } else {
      confirmPreDraftBtn.disabled = false;
      confirmPreDraftBtn.innerText = 'Xác nhận';
      confirmPreDraftBtn.classList.add('btn-success');
      confirmPreDraftBtn.classList.remove('btn-secondary');
    }

  } else {
    preDraftViewEl.style.display = 'none';
    teamsContainerEl.style.display = 'flex'; // Hiện lại giao diện draft chính
  }
  // --- Kết thúc logic Pre-Draft ---

  // Nếu player đang ở màn hình pre-draft, không render phần còn lại.
  if (shouldShowPreDraft) {
    return;
  }

  // --- Cập nhật hiển thị Pre-Draft Selections trên màn hình chính ---
  if (room.preDraftSelections) {
    const playerOrder = room.playerOrder || [];
    updatePreDraftSelections(room.preDraftSelections?.[playerOrder[0]] || [], p1PreDraftDisplayEl);
    updatePreDraftSelections(room.preDraftSelections?.[playerOrder[1]] || [], p2PreDraftDisplayEl);
  }

  // Cập nhật tên 2 team (luôn cập nhật nếu có player)
  if (room.playerOrder && room.playerHistory) {
    if (room.playerOrder.length > 0) {
      const p1_id = room.playerOrder[0];
      document.querySelector('#player1-container h3').innerText = truncateName(room.playerHistory[p1_id]?.name) || 'Player 1';
    }
    if (room.playerOrder.length > 1) {
      const p2_id = room.playerOrder[1];
      document.querySelector('#player2-container h3').innerText = truncateName(room.playerHistory[p2_id]?.name) || 'Player 2';
    }
  }

  // Cập nhật hiển thị timer
  if (room.paused) {
    document.getElementById("countdown-text").innerText = "PAUSED";
  } else {
    const countdownTextEl = document.getElementById("countdown-text");
    if (room.countdown != null && room.nextTurn) {
      countdownTextEl.innerText = room.countdown;
    } else {
      countdownTextEl.innerText = "";
    }

    // Cập nhật vòng tròn countdown
    const countdownBar = document.getElementById('countdown-bar');
    if (countdownBar && room.countdown != null && room.nextTurn) {
      const totalTime = room.countdownDuration || 30;
      const scale = room.countdown / totalTime; // Giá trị từ 0 đến 1
      countdownBar.style.transform = `scaleX(${scale})`;
    } else if (countdownBar) {
      // Reset khi không có lượt
      countdownBar.style.transform = 'scaleX(1)';
    }
  }

  // Hiển thị đội đi trước
  const firstPickStatusEl = document.getElementById("first-pick-status");
  if (room.draftOrder && room.draftOrder.length > 0) {
    const firstTeam = room.draftOrder[0].team;
    firstPickStatusEl.innerText = `Chọn trước: ${room.players[firstTeam]?.name || firstTeam.toUpperCase()}`;
    firstPickStatusEl.innerHTML = `ID Phòng: <strong>${myRoom}</strong>`;
  } else {
    firstPickStatusEl.innerHTML = `ID Phòng: <strong>${myRoom}</strong>`;
  }

  // Hiển thị trạng thái các đội đã tham gia
  const playerStatusEl = document.getElementById("player-status");
  if (room.players) {
    // Sử dụng room.playerOrder để đảm bảo thứ tự nhất quán
    const playerOrder = room.playerOrder || [];
    const connectedPlayerIds = new Set(Object.keys(room.players));
    let statusHTML = '';

    // Player 1
    if (playerOrder.length > 0) {
        const p1_id = playerOrder[0];
        const p1_data = room.players[p1_id] || room.playerHistory[p1_id]; // Lấy data từ history nếu đã dc
        if (connectedPlayerIds.has(p1_id)) {
            statusHTML += `<span class="me-4" style="color: white; font-weight: bold;">✅ <strong>${truncateName(p1_data.name)}:</strong> Đã kết nối</span>`;
        } else {
            statusHTML += `<span class="me-4" style="color:white; font-style: italic;">❌ <strong>${truncateName(p1_data.name)}:</strong> Mất kết nối</span>`;
        }
    } else {
        statusHTML += `<span class="me-4" style="color: white;">⏳ <strong>Player 1:</strong> Đợi...</span>`;
    }

    // Player 2
    if (playerOrder.length > 1) {
        const p2_id = playerOrder[1];
        const p2_data = room.players[p2_id] || room.playerHistory[p2_id];
        if (connectedPlayerIds.has(p2_id)) {
            statusHTML += `<span style="color: white; font-weight: bold;">✅ <strong>${truncateName(p2_data.name)}:</strong> Đã kết nối</span>`;
        } else {
            statusHTML += `<span style="color: white; font-style: italic;">❌ <strong>${truncateName(p2_data.name)}:</strong> Mất kết nối</span>`;
        }
    } else {
        statusHTML += `<span style="color: white;">⏳ <strong>Player 2:</strong> Đợi...</span>`;
    }

    playerStatusEl.innerHTML = statusHTML;
  }

  // Ẩn/hiện phần chọn tướng dựa trên vai trò
  if (myRole === 'player' || myRole === 'host') {
    champSelectionControlsEl.style.display = "block";
    const searchInput = document.getElementById('champ-search');
    const lockInButtonContainer = lockInButton.parentElement; // div.d-grid
    if (myRole === 'host') {
      searchInput.style.display = 'none';
      const lockInButtonContainers = document.getElementById('lock-in-button');
      lockInButtonContainers.style.display = 'none';
    } else {
      searchInput.style.display = 'block';
      lockInButtonContainer.style.display = 'block';
    }
  } else { // Ẩn cho host hoặc khi chưa tham gia
    champSelectionControlsEl.style.display = "none";
  }

  // Vô hiệu hóa nút lock-in khi game bị pause
  lockInButton.disabled = room.paused || !preSelectedChamp || room.nextTurn?.team !== socket.id;

  // Reset trạng thái chọn nháp khi có lượt mới
  if (turnChanged) {
    lockInButton.disabled = true;
    document.querySelectorAll('.champ-item.pre-selected').forEach(el => el.classList.remove('pre-selected'));
    preSelectedChamp = null;
    remotePreSelectedChamp = null; // Xóa cả lựa chọn nháp từ xa
    socket.emit("pre-select-champ", { roomId: myRoom, champ: null }); // Gửi tín hiệu xóa chọn nháp

    // Reset vòng tròn countdown ngay lập tức
    const countdownBar = document.getElementById('countdown-bar');
    countdownBar.style.transition = 'none'; // Tắt hiệu ứng chuyển tiếp
    countdownBar.style.transform = 'scaleX(1)';
    countdownBar.offsetHeight; // Kích hoạt reflow để áp dụng thay đổi ngay
    countdownBar.style.transition = 'transform 1s linear'; // Bật lại hiệu ứng
  }

  if (room.nextTurn) {
    if (currentTurnEl) {
      currentTurnEl.innerText = `Current Turn: ${room.nextTurn.team.toUpperCase()} team to ${room.nextTurn.type.toUpperCase()}`;
      currentTurnEl.style.color = room.nextTurn.team; // 'blue' hoặc 'red'
    }
  } else {
    if (currentTurnEl) {
      if (room.actions && room.actions.length > 0) {
        currentTurnEl.innerText = "Draft Finished";
      } else {
        currentTurnEl.innerText = "Waiting for host to start the draft...";
      }
      currentTurnEl.style.color = "black"; // Reset màu khi hoàn tất
    }
    lockInButton.disabled = true; // Vô hiệu hóa nút khi draft kết thúc
  }

  const turn = room.nextTurn;
  const blueBanSlots = [...blueBansEl.children]; 
  const redBanSlots = [...redBansEl.children]; 
  // Gộp các slot từ 2 phase lại để xử lý chung
  const bluePickSlots = [...bluePicksP1El.children, ...bluePicksP2El.children];
  const redPickSlots = [...redPicksP1El.children, ...redPicksP2El.children];


  // Xóa highlight khỏi tất cả các ô
  for (let i = 0; i < banSlotsCount; i++) {
    blueBanSlots[i].classList.remove("highlight");
    redBanSlots[i].classList.remove("highlight");
  }
  for (let i = 0; i < pickSlotsCount; i++) {
    bluePickSlots[i].classList.remove("highlight");
    redPickSlots[i].classList.remove("highlight");
  }

  // Logic gán số thứ tự cho các ô pick của mỗi người chơi từ 1 đến 9
  bluePickSlots.forEach((slot, index) => {
    slot.dataset.turnNumber = index + 1;
  });
  redPickSlots.forEach((slot, index) => {
    slot.dataset.turnNumber = index + 1;
  });
  // Gán số thứ tự cho các ô ban
  blueBanSlots.forEach((slot, index) => {
    slot.dataset.turnNumber = index + 1;
  });
  redBanSlots.forEach((slot, index) => {
    slot.dataset.turnNumber = index + 1;
  });


  // Cập nhật trạng thái disabled cho lưới tướng
  const disabledChamps = new Set(room.actions.map(a => a.champ));

  // Tìm các tướng trùng lặp trong pre-draft
  if (room.preDraftSelections) {
    const playerSelections = Object.values(room.preDraftSelections);
    if (playerSelections.length === 2) {
      const [p1_selections, p2_selections] = playerSelections;
      const p1_set = new Set(p1_selections);
      p2_selections.forEach(champ => {
        if (p1_set.has(champ)) {
          disabledChamps.add(champ); // Thêm tướng trùng lặp vào danh sách vô hiệu hóa
        }
      });
    }
  }
  document.querySelectorAll('.champ-item').forEach(item => {
    if (disabledChamps.has(item.dataset.name)) {
      item.classList.add('disabled');
    } else {
      item.classList.remove('disabled');
    }
  });
  // Cập nhật ô theo actions
  let blueIndex = 0;
  let redIndex = 0;
  let blueBanIndex = 0, bluePickIndex = 0;
  let redBanIndex = 0, redPickIndex = 0;

  // Reset data-indexed để vẽ lại từ đầu
  for (let i = 0; i < banSlotsCount; i++) {
    blueBanSlots[i].removeAttribute('data-indexed');
    redBanSlots[i].removeAttribute('data-indexed');
  }
  for (let i = 0; i < pickSlotsCount; i++) {
    bluePickSlots[i].removeAttribute('data-indexed');
    redPickSlots[i].removeAttribute('data-indexed');
  }

  room.actions.forEach((a) => {
    const playerOrder = room.playerOrder || [];
    const isPlayer1 = playerOrder.length > 0 && a.team === playerOrder[0];

    const isBan = a.type === 'ban';
    const teamSlots = isBan ? (isPlayer1 ? blueBanSlots : redBanSlots) : (isPlayer1 ? bluePickSlots : redPickSlots);
    const index = isBan ? (isPlayer1 ? blueBanIndex++ : redBanIndex++) : (isPlayer1 ? bluePickIndex++ : redPickIndex++);

    if (index < teamSlots.length) {
      const charData = characters[a.champ]; // Tra cứu thông tin tướng
      if (a.champ === 'SKIPPED') {
        teamSlots[index].innerHTML = `<div class='${a.type}'>${a.type.toUpperCase()}</div><div class="slot-name-box">SKIPPED</div>`;
        teamSlots[index].classList.add('skipped');
      } else {
        const iconHtml = charData ? `<img class="slot-img" src="${charData.icon}" alt="${charData.en}">` : '';
        const nameHtml = charData ? `<div class="slot-name-box">${charData.en}</div>` : `<div class="slot-name-box">${a.champ}</div>`;
        teamSlots[index].innerHTML = `<div class='${a.type}'>${a.type.toUpperCase()}</div>${iconHtml}${nameHtml}`;
        teamSlots[index].classList.remove('skipped');
        if (isBan) {
          teamSlots[index].classList.add('banned');
        }
      }
      if (charData && charData.element && a.champ !== 'SKIPPED') {
        teamSlots[index].style.backgroundColor = elementColors[charData.element] || '#ccc'; // Đặt màu nền theo element
      }
      teamSlots[index].dataset.indexed = "1";

      // Thêm animation khi có action mới
      if (room.actions.length > (currentRoomState?.actions?.length || 0)) {
        teamSlots[index].classList.remove("slot-reveal-animation");
        void teamSlots[index].offsetWidth; // Kích hoạt reflow
        teamSlots[index].classList.add("slot-reveal-animation");
      }
    }
  });

  // Đảm bảo tất cả các ô được cập nhật đúng
  for (let i = 0; i < banSlotsCount; i++) {
    if (!blueBanSlots[i].dataset.indexed) {
      blueBanSlots[i].innerHTML = "";
      blueBanSlots[i].classList.remove('banned');
    }
    if (!redBanSlots[i].dataset.indexed) {
      redBanSlots[i].innerHTML = "";
      redBanSlots[i].classList.remove('banned');
    }
  }
  for (let i = 0; i < pickSlotsCount; i++) {
    if (!bluePickSlots[i].dataset.indexed) bluePickSlots[i].innerHTML = "";
    if (!redPickSlots[i].dataset.indexed) redPickSlots[i].innerHTML = "";
  }

  // Logic highlight mới
  if (turn) {
    const isBan = turn.type === 'ban';
    const playerOrder = room.playerOrder || [];
    const isPlayer1Turn = playerOrder.length > 0 && turn.team === playerOrder[0];
    const teamSlots = isBan ? (isPlayer1Turn ? blueBanSlots : redBanSlots) : (isPlayer1Turn ? bluePickSlots : redPickSlots);
    for (let i = 0; i < teamSlots.length; i++) { // Lặp qua các slot của team có lượt
      if (!teamSlots[i].dataset.indexed) {
        teamSlots[i].classList.add("highlight");
        break;
      }
    }
  }

  //log(`Next turn: ${turn ? turn.team + " " + turn.type : "Finished"} (Phase ${room.phase})`);

  // --- Cập nhật ảnh splash art cho hành động cuối cùng ---
  const splashContainer = document.getElementById('splash-art-container');
  if (preSelectedChamp || remotePreSelectedChamp) {
    // Đã có logic xử lý khi chọn nháp
  } else if (room.nextTurn) {
    splashContainer.style.display = 'block';
    updateSplashArt(null); // Làm mới khi bắt đầu lượt mới
  } else {
    // Ẩn đi khi draft chưa bắt đầu hoặc đã kết thúc
    splashContainer.style.display = 'none';
    remotePreSelectedChamp = null; // Dọn dẹp khi draft kết thúc
    updateSplashArt(null); // Dọn dẹp khi draft kết thúc
  }
});

socket.on("pre-select-update", ({ champ }) => {
  remotePreSelectedChamp = champ; // Lưu lại lựa chọn nháp từ xa
  const splashContainer = document.getElementById('splash-art-container');
  if (champ) {
    splashContainer.style.display = 'block';
    updateSplashArt(champ);
  } else {
    // Khi người khác hủy chọn nháp, quay lại hiển thị hành động cuối cùng
    if (currentRoomState?.actions.length > 0) {
      const lastAction = currentRoomState.actions[currentRoomState.actions.length - 1];
      updateSplashArt(lastAction.champ, `${lastAction.type.toUpperCase()}`);
    } else {
      splashContainer.style.display = 'none';
    }
  }
});
function updateSplashArt(champName, lockedActionType = null) {
  const splashImg = document.getElementById('splash-art-img');
  const splashNameEl = document.getElementById('splash-art-name');
  const charData = characters[champName];
  const turn = currentRoomState.nextTurn;

  if (charData) {
    let turnText = '';
    splashImg.style.display = 'block'; // Hiện ảnh
    if (turn) {
      turnText = `${truncateName(currentRoomState.players[turn.team]?.name).toUpperCase() || '???'}: ${(turn.type).toUpperCase() =="PICK" ? "CHỌN" : "CẤM"}`;// ${charData.en}`;
    } else if (lockedActionType) {
      // Khi draft kết thúc, hiển thị hành động cuối cùng
      const lastAction = currentRoomState.actions[currentRoomState.actions.length - 1];
      turnText = "";//`${lastAction.team.toUpperCase()} ${lastAction.type.toUpperCase()}`;
    }
    const playerOrder = currentRoomState.playerOrder || [];
    const turnColor = turn ? (playerOrder[0] === turn.team ? 'blue' : 'red') : 'white';
    splashImg.src = charData.background || '';
    splashNameEl.innerText = turnText;
    splashNameEl.style.color = turnColor;
    // splashImg.style.display = 'block'; // Hiện ảnh
  } else {
    // Xử lý cho trường hợp SKIPPED hoặc không tìm thấy tướng
    const turn = currentRoomState.nextTurn;
    splashImg.src = '';
    if (turn) {
      splashNameEl.innerText = `${truncateName(currentRoomState.players[turn.team]?.name).toUpperCase() || '???'}: ${turn.type.toUpperCase() =="PICK" ? "CHỌN" : "CẤM"}`;
    } else if (currentRoomState && currentRoomState.actions.length > 0) {
      splashNameEl.innerText = lockedActionType || 'DRAFT COMPLETE';
    } else {
      splashNameEl.innerText = 'Đợi host bắt đầu...';
    }
    const playerOrder = currentRoomState.playerOrder || [];
    splashNameEl.style.color = turn ? (playerOrder[0] === turn.team ? 'blue' : 'red') : 'white';
    splashImg.style.display = 'none'; // Ẩn ảnh
  }
}

function renderPreDraftChampionGrid(gridElement, localSelections, opponentSelections) {
  gridElement.innerHTML = "";

  uniqueCharacters.forEach(char => {
    const item = document.createElement('div');
    item.className = 'champ-item';
    item.dataset.name = char.en;
    item.innerHTML = `<img src="${char.icon}" alt="${char.en}" title="${char.en}"><div class="grid-champ-name">${char.en}</div>`;

    if (localSelections.includes(char.en)) {
      item.classList.add('pre-draft-selected');
    }

    item.onclick = () => {
      // Logic cũ chặn chọn tướng của đối thủ đã được gỡ bỏ
      const isSelected = localSelections.includes(char.en);
      if (isSelected) {
        myPreDraftSelection = localSelections.filter(c => c !== char.en);
      } else {
        myPreDraftSelection.push(char.en);
      }
      socket.emit('pre-draft-select', { roomId: myRoom, champs: myPreDraftSelection });
    };
    gridElement.appendChild(item);
  });
}

function updatePreDraftSelections(selections, containerElement) {
  containerElement.innerHTML = "";
  selections.forEach(champName => {
    const char = characters[champName];
    if (!char) return;
    // Thêm div cho tên tướng
    containerElement.innerHTML += `
      <div class="champ-item" title="${char.en}">
        <img src="${char.icon}" alt="${char.en}">
        <div class="pre-draft-display-champ-name">${char.en}</div>
      </div>`;
  });
}
socket.on("draft-finished", (data) => {
  lockInButton.disabled = true;

  // console.log(data);
  // log("=== DRAFT COMPLETE ===");
  // log("Blue: " + JSON.stringify(data.blue, null, 2));
  // log("Red: " + JSON.stringify(data.red, null, 2));
});

socket.on("draft-error", (data) => {
  alert(`Lỗi: ${data.message}`);
  // Nếu lỗi liên quan đến việc không tìm thấy phòng, quay lại màn hình login
  if (data.message.toLowerCase().includes('room not found')) {
    loginViewEl.style.display = 'block';
    draftViewEl.style.display = 'none';
  }
});

socket.on("host-left", () => {
  alert("Host đã rời phòng, phòng sẽ được đóng lại.");
  loginViewEl.style.display = 'block';
  draftViewEl.style.display = 'none';
  window.location.reload();
});

socket.on('kicked', (data) => {
  alert(`Bạn đã bị kick khỏi phòng: ${data.reason || 'Bị kick bởi host'}`);
  window.location.reload();
});