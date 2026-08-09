const childLinks = document.getElementById('childLinks');
const familyBlockedBox = document.getElementById('familyBlockedBox');

async function loadFamilyStatus() {
  try {
    const res = await fetch('api/settings/status');
    if (!res.ok) return true;
    const data = await res.json();
    return data.enabled !== false;
  } catch (err) {
    return true;
  }
}

async function loadChildLinks(familyEnabled) {
  childLinks.innerHTML = '';
  try {
    const res = await fetch('api/children');
    if (!res.ok) return;
    const children = await res.json();
    if (children.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'subtitle';
      msg.textContent = t('index_no_children');
      childLinks.appendChild(msg);
      return;
    }
    children.forEach((child) => {
      const link = document.createElement('a');
      link.textContent = `${t('index_child_link_prefix')} ${child.name}`;
      if (familyEnabled) {
        link.href = `dieta.html?child=${encodeURIComponent(child.id)}`;
      } else {
        link.href = '#';
        link.setAttribute('aria-disabled', 'true');
        link.style.opacity = '0.5';
        link.style.pointerEvents = 'none';
        link.tabIndex = -1;
      }
      childLinks.appendChild(link);
    });
  } catch (err) {
    console.error('Nepodarilo sa načítať zoznam detí:', err);
  }
}

initLanguage().then(async () => {
  document.title = t('index_title');
  const familyEnabled = await loadFamilyStatus();
  if (!familyEnabled) {
    familyBlockedBox.textContent = t('family_not_enabled_msg');
    familyBlockedBox.style.display = 'block';
  }
  loadChildLinks(familyEnabled);
});
