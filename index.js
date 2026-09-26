let intervalId = null;

/* ===== Работа со временем ===== */
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function isNowInWorkingTime(startTime, endTime) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    nowMinutes >= timeToMinutes(startTime) &&
    nowMinutes < timeToMinutes(endTime)
  );
}

/* ===== Настройки ===== */
async function getSettings() {
  return await chrome.storage.local.get({
    botId: 'T0KEN',
    chatId: '1234',
    pollingInterval: 40000,
    tabState: 'OFF',
    startTime: '10:00',
    endTime: '17:00'
  });
}

/* ===== Telegram ===== */
const sendMessage = async (type) => {
  const { botId, chatId } = await getSettings();
  const data = new FormData();
  data.append('chat_id', chatId);
  data.append('text', `${type}`);
  navigator.sendBeacon(
    `https://api.telegram.org/bot${botId}/sendMessage`,
    data
  );
};

/* ===== Парсинг ===== */
function extractDocIds() {
  const tbodyList = document.querySelectorAll("tbody.native");
  let ids = [];
  tbodyList.forEach(tbody => {
    const trs = tbody.querySelectorAll('tr[data-accuracy="sse-bulletin-new"]');
    trs.forEach(tr => ids.push(tr.getAttribute("data-doc-id")));
  });
  return ids;
}

const getStorageKey = () =>
  `latestIds_${location.host}${location.pathname}`;

async function checkNewItems() {
  const key = getStorageKey();
  const ids = extractDocIds();

  chrome.storage.local.get([key], result => {
    const latestIds = result[key];

    if (!latestIds) {
      chrome.storage.local.set({ [key]: ids });
      return;
    }

    if (JSON.stringify(ids) !== JSON.stringify(latestIds)) {
      const docId = ids[0];
      const tbody = document.querySelector("tbody.native");
      const tr = tbody?.querySelector(
        `tr[data-accuracy="sse-bulletin-new"][data-doc-id="${docId}"]`
      );
      const a = tr?.querySelector(
        'a.bulletinLink.bull-item__self-link.auto-shy[data-role="bulletin-link"]'
      );

      if (a) {
        sendMessage('Новый товар(-ы)! ' + a.href);
      }
    }

    chrome.storage.local.set({ [key]: ids });
  });
}

/* ===== Таймер обновления ===== */
async function startOrStopInterval() {
  const { tabState, pollingInterval, startTime, endTime } =
    await getSettings();

  if (intervalId) {
    clearTimeout(intervalId);
    intervalId = null;
  }

  if (tabState !== 'ON') return;

  const runCycle = async () => {
    const randomOffset = Math.floor(Math.random() * 20000); // 0–20 сек
    const delay = pollingInterval + randomOffset;

    intervalId = setTimeout(async () => {
      if (isNowInWorkingTime(startTime, endTime)) {
        location.reload();
      } else {
        // вне рабочего времени — просто перепланируем
        await startOrStopInterval();
      }
    }, delay);
  };

  await runCycle();
}

/* ===== Запуск ===== */
async function run() {
  await checkNewItems();
  await startOrStopInterval();
}

window.addEventListener('load', run);

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (
    area === 'local' &&
    (
      'tabState' in changes ||
      'startTime' in changes ||
      'endTime' in changes
    )
  ) {
    await startOrStopInterval();
  }
});