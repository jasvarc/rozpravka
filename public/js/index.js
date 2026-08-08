const childLinks = document.getElementById('childLinks');

async function loadChildLinks() {
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
      link.href = `dieta.html?child=${encodeURIComponent(child.id)}`;
      link.textContent = `${t('index_child_link_prefix')} ${child.name}`;
      childLinks.appendChild(link);
    });
  } catch (err) {
    console.error('Nepodarilo sa načítať zoznam detí:', err);
  }
}

initLanguage().then(() => {
  document.title = t('index_title');
  loadChildLinks();
});
