const toggleBtn = document.getElementById('toggleState');
const botIdInput = document.getElementById('botId');
const chatIdInput = document.getElementById('chatId');
const startTimeInput = document.getElementById('startTime');
const endTimeInput = document.getElementById('endTime');
const saveBtn = document.getElementById('saveSettings');
const checkDataBtn = document.getElementById('checkData');

const proxyEnabledInput = document.getElementById('proxyEnabled');
const proxyTypeInput = document.getElementById('proxyType');
const proxyHostInput = document.getElementById('proxyHost');
const proxyPortInput = document.getElementById('proxyPort');
const proxyUserInput = document.getElementById('proxyUser');
const proxyPassInput = document.getElementById('proxyPass');
const saveProxyBtn = document.getElementById('saveProxy');

async function loadSettings() {
  const result = await chrome.storage.local.get([
    'tabState',
    'botId',
    'chatId',
    'startTime',
    'endTime',
    'proxyEnabled',
    'proxyType',
    'proxyHost',
    'proxyPort',
    'proxyUser',
    'proxyPass'
  ]);

  const state = result.tabState || 'OFF';
  toggleBtn.textContent = state === 'ON' ? 'ВКЛ' : 'ВЫКЛ';

  botIdInput.value = result.botId || '';
  chatIdInput.value = result.chatId || '';
  startTimeInput.value = result.startTime || '10:00';
  endTimeInput.value = result.endTime || '17:00';

  proxyEnabledInput.checked = result.proxyEnabled !== false;
  proxyTypeInput.value = result.proxyType || 'socks5';
  proxyHostInput.value = result.proxyHost || '';
  proxyPortInput.value = result.proxyPort || '';
  proxyUserInput.value = result.proxyUser || '';
  proxyPassInput.value = result.proxyPass || '';
}

toggleBtn.addEventListener('click', async () => {
  const { tabState } = await chrome.storage.local.get('tabState');
  const newState = tabState === 'ON' ? 'OFF' : 'ON';

  await chrome.storage.local.set({ tabState: newState });
  toggleBtn.textContent = newState === 'ON' ? 'ВКЛ' : 'ВЫКЛ';

  if (newState === 'ON') {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (tab?.url && /^https:\/\/(www\.)?farpost\.ru/.test(tab.url)) {
        chrome.tabs.reload(tab.id);
      }
    } catch (err) {
      console.error('Ошибка:', err);
    }
  }
});

saveBtn.addEventListener('click', async () => {
  await chrome.storage.local.set({
    botId: botIdInput.value,
    chatId: chatIdInput.value,
    startTime: startTimeInput.value,
    endTime: endTimeInput.value
  });
  alert('Настройки сохранены!');
});

saveProxyBtn.addEventListener('click', async () => {
  const host = proxyHostInput.value.trim();
  const port = proxyPortInput.value.trim();

  if (proxyEnabledInput.checked && (!host || !port)) {
    alert('Укажите хост и порт прокси!');
    return;
  }

  await chrome.storage.local.set({
    proxyEnabled: proxyEnabledInput.checked,
    proxyType: proxyTypeInput.value,
    proxyHost: host,
    proxyPort: port,
    proxyUser: proxyUserInput.value,
    proxyPass: proxyPassInput.value
  });

  alert('Настройки прокси сохранены! Применяются автоматически.');
});

checkDataBtn.addEventListener('click', async () => {
  const { botId, chatId } =
    await chrome.storage.local.get(['botId', 'chatId']);

  if (!botId || !chatId) {
    alert('Укажите botId и chatId!');
    return;
  }

  const data = new FormData();
  data.append('chat_id', chatId);
  data.append('text', 'Данные указаны верно');

  navigator.sendBeacon(
    `https://api.telegram.org/bot${botId}/sendMessage`,
    data
  );

  alert('Сообщение отправлено!');
});

loadSettings();
