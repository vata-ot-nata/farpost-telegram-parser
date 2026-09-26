/* ===== Настройки прокси по умолчанию ===== */
async function getProxySettings() {
  return await chrome.storage.local.get({
    proxyEnabled: true,
    proxyType: 'socks5',        // 'socks5' | 'http'
    proxyHost: '',
    proxyPort: '',
    proxyUser: '',
    proxyPass: '',
    // Домены, которые нужно пускать через прокси. Остальное — напрямую.
    proxyDomains: ['api.telegram.org']
  });
}

/* ===== Генерация PAC-скрипта ===== */
function buildPacScript(type, host, port, domains) {
  const scheme = type === 'socks5' ? 'SOCKS5' : 'PROXY';

  const domainChecks = domains
    .map(d => `shExpMatch(host, "${d}") || shExpMatch(host, "*.${d}")`)
    .join(' || ');

  return `
    function FindProxyForURL(url, host) {
      if (${domainChecks || 'false'}) {
        return "${scheme} ${host}:${port}; DIRECT";
      }
      return "DIRECT";
    }
  `;
}

/* ===== Применение настроек прокси к браузеру ===== */
async function applyProxySettings() {
  const settings = await getProxySettings();

  if (!settings.proxyEnabled || !settings.proxyHost || !settings.proxyPort) {
    await chrome.proxy.settings.clear({ scope: 'regular' });
    console.log('[proxy] отключено или не настроено — прокси очищен');
    return;
  }

  const pacScript = buildPacScript(
    settings.proxyType,
    settings.proxyHost,
    settings.proxyPort,
    settings.proxyDomains
  );

  await chrome.proxy.settings.set({
    value: {
      mode: 'pac_script',
      pacScript: { data: pacScript }
    },
    scope: 'regular'
  });

  console.log('[proxy] применено:', settings.proxyType, settings.proxyHost + ':' + settings.proxyPort, 'для', settings.proxyDomains);
}

/* ===== Автоматическая авторизация на прокси ===== */
chrome.webRequest.onAuthRequired.addListener(
  async (details, asyncCallback) => {
    if (!details.isProxy) {
      asyncCallback();
      return;
    }

    const settings = await getProxySettings();

    if (settings.proxyUser) {
      asyncCallback({
        authCredentials: {
          username: settings.proxyUser,
          password: settings.proxyPass || ''
        }
      });
    } else {
      asyncCallback();
    }
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);

/* ===== Реакция на запуск и изменение настроек ===== */
chrome.runtime.onInstalled.addListener(applyProxySettings);
chrome.runtime.onStartup.addListener(applyProxySettings);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  const proxyKeys = [
    'proxyEnabled',
    'proxyType',
    'proxyHost',
    'proxyPort',
    'proxyUser',
    'proxyPass',
    'proxyDomains'
  ];

  if (proxyKeys.some(key => key in changes)) {
    applyProxySettings();
  }
});
