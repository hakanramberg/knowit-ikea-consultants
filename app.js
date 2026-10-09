'use strict';

const icons = {
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m4 0h2m-8 3h2"/></svg>'
};
const state = { consultants: [], query: '', technology: '', onlyNew: false, newGroup: null };
const additions = window.KNOWIT_NEW_PROFILES;
const search = document.querySelector('#search');
const technology = document.querySelector('#technology');
const grid = document.querySelector('#consultant-grid');
const dialog = document.querySelector('#profile-dialog');
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en');

function portrait(person) {
  if (person.portrait) return `<img class="portrait" src="${esc(person.portrait)}" alt="Portrait of ${esc(person.name)}" loading="lazy" width="82" height="92">`;
  const initials = person.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('');
  return `<div class="portrait portrait-placeholder" role="img" aria-label="Photo unavailable for ${esc(person.name)}"><strong aria-hidden="true">${esc(initials)}</strong><span aria-hidden="true">No photo</span></div>`;
}

function downloadLink(person, prominent = false) {
  return `<a class="${prominent ? 'button button-primary' : 'cv-link'}" href="${esc(person.cv)}" download="${esc(person.cvName)}" data-cv-id="${esc(person.id)}" aria-label="Download CV for ${esc(person.name)}, ${esc(person.cvFormat)}">${icons.download}<span>Download CV</span>${prominent ? '' : `<span class="file-format">${esc(person.cvFormat)}</span>`}</a>`;
}

function rateBadges(person) {
  const medal = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/></svg>';
  const badges = [];
  if (person.normallyExpertRate) badges.push(`<span class="rate-badge rate-badge-silver">${medal}<span>Normally Expert rate</span></span>`);
  if (person.requiredExpertRate) badges.push(`<span class="rate-badge rate-badge-gold">${medal}<span>Required Expert rate</span></span>`);
  return badges.length ? `<div class="rate-badges">${badges.join('')}</div>` : '';
}

function card(person) {
  return `<article class="consultant-card" data-id="${esc(person.id)}">
    ${addedBadge(person)}
    <div class="card-head">${portrait(person)}<div class="card-identity"><h3>${esc(person.name)}</h3><p class="role">${esc(person.role)}</p></div></div>
    <p class="availability-badge">${icons.calendar}<span>Available <strong>${esc(person.availabilityLabel)}</strong></span></p>
    ${rateBadges(person)}
    <p class="card-summary">${esc(person.summary)}</p>
    <ul class="skill-tags" aria-label="IKEA RFX competences">${person.tags.map(tag => `<li>${esc(tag)}</li>`).join('')}</ul>
    <div class="card-actions"><button class="profile-button" type="button" data-profile="${esc(person.id)}" aria-label="View profile for ${esc(person.name)}">View profile ${icons.arrow}</button>${downloadLink(person)}</div>
  </article>`;
}

function renderResults() {
  renderNewProfiles();
  const queryTerms = normalize(state.query.trim()).split(/\s+/).filter(Boolean);
  const filtered = state.consultants.filter(person => {
    if (state.onlyNew && !state.newGroup?.people.some(item => item.id === person.id)) return false;
    if (state.technology && !person.competenceIds.includes(state.technology)) return false;
    const text = normalize([person.name, person.role, person.clients, person.availabilityLabel].join(' '));
    return queryTerms.every(term => text.includes(term));
  });
  const months = [...new Set(filtered.map(person => person.availabilityMonth))];
  grid.innerHTML = months.map(month => {
    const group = filtered.filter(person => person.availabilityMonth === month);
    return `<div class="availability-group"><h3>${esc(group[0].availabilityLabel)}</h3><span>${group.length} ${group.length === 1 ? 'consultant' : 'consultants'}</span></div>${group.map(card).join('')}`;
  }).join('');
  document.querySelector('#results-count').innerHTML = `Showing <strong>${filtered.length}</strong> of ${state.consultants.length} consultants`;
  document.querySelector('#empty-state').hidden = filtered.length > 0;
  document.querySelector('#reset').hidden = !state.query && !state.technology && !state.onlyNew;
}

function resetFilters() {
  state.query = ''; state.technology = ''; state.onlyNew = false;
  search.value = ''; technology.value = '';
  renderResults();
}

function openProfile(id) {
  const person = state.consultants.find(item => item.id === id);
  if (!person) return;
  state.profileId = id;
  const fileSize = person.cvBytes > 1048576 ? `${(person.cvBytes / 1048576).toLocaleString('en-GB', { maximumFractionDigits: 1 })} MB` : `${Math.ceil(person.cvBytes / 1024)} kB`;
  document.querySelector('#profile-content').innerHTML = `
    <div class="profile-header">${portrait(person)}<div><h2 id="profile-name">${esc(person.name)}</h2><p class="role">${esc(person.role)}</p></div></div>
    ${addedBadge(person)}
    <div class="profile-availability">${icons.calendar}<div><span>Available from</span><strong>${esc(person.availabilityLabel)}</strong></div></div>
    ${rateBadges(person)}
    <p class="profile-summary">${esc(person.summary)}</p>
    <section class="detail-section"><h3>IKEA RFX competences</h3><ul class="evidence-list">${person.rfxSkills.map(skill => `<li><i class="evidence-dot" aria-hidden="true"></i><span>${esc(skill.name)}</span></li>`).join('')}</ul></section>
    <section class="detail-section"><h3>Selected previous clients</h3><p class="clients">${esc(person.clients)}</p></section>
    ${person.comment ? `<section class="detail-section profile-comment"><h3>Comment</h3><p class="comment-text">${esc(person.comment)}</p></section>` : ''}
    <div class="profile-download"><div class="download-description"><strong>Full consultant CV</strong><span>Original CV · ${esc(person.cvFormat)} · ${fileSize}</span></div>${downloadLink(person, true)}</div>`;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  dialog.scrollTop = 0;
  document.querySelector('.close-dialog').focus();
}

search.addEventListener('input', () => { state.query = search.value; renderResults(); });
technology.addEventListener('change', () => { state.technology = technology.value; renderResults(); });
grid.addEventListener('click', event => {
  const button = event.target.closest('[data-profile]');
  if (button) openProfile(button.dataset.profile);
});
document.querySelector('#reset').addEventListener('click', () => { resetFilters(); search.focus({ preventScroll: true }); });
document.querySelector('#empty-reset').addEventListener('click', () => { resetFilters(); search.focus(); });
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener('close', () => { document.body.style.overflow = ''; });

// Browsers ignore the download attribute for some file:// links. A local
// byte-for-byte copy provides the same direct download when opened from disk.
document.addEventListener('click', event => {
  const link = event.target.closest('[data-cv-id], [data-all-cvs]');
  if (location.protocol !== 'file:' || !link) return;
  const allCVs = link.hasAttribute('data-all-cvs');
  const encoded = allCVs ? window.KNOWIT_ALL_CVS_DATA : window.KNOWIT_CV_DATA?.[link.dataset.cvId];
  if (!encoded) return;
  event.preventDefault();
  const person = state.consultants.find(item => item.id === link.dataset.cvId);
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const type = allCVs ? 'application/zip' : person.cvFormat === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const download = document.createElement('a');
  download.href = url; download.download = link.download; download.hidden = true;
  document.body.appendChild(download); download.click(); download.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

async function loadOfflineDownloads() {
  if (location.protocol !== 'file:') return;
  await Promise.all(['cv-data.js', 'all-cvs-data.js'].map(src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  })));
}

async function init() {
  try {
    await loadOfflineDownloads();
    if (!Array.isArray(window.KNOWIT_CONSULTANTS) || !Array.isArray(window.KNOWIT_RFX_COMPETENCES)) throw new Error('Could not load profiles');
    state.consultants = [...window.KNOWIT_CONSULTANTS].sort((a, b) => a.availabilityMonth.localeCompare(b.availabilityMonth) || a.name.localeCompare(b.name, 'sv'));
    document.querySelector('#hero-description').textContent = `${state.consultants.length} consultants for your next step. Explore their experience, check availability and download their original CVs.`;
    const months = [...new Set(state.consultants.map(person => person.availabilityMonth))];
    document.querySelector('#availability-overview').innerHTML = months.map(month => {
      const group = state.consultants.filter(person => person.availabilityMonth === month);
      return `<div class="availability-summary-item"><strong>${group.length}</strong><span>${esc(group[0].availabilityLabel)}</span></div>`;
    }).join('');
    technology.innerHTML += window.KNOWIT_RFX_COMPETENCES.map(skill => `<option value="${esc(skill.id)}">${esc(skill.label)} (${state.consultants.filter(person => person.competenceIds.includes(skill.id)).length})</option>`).join('');
    renderResults();
  } catch (error) {
    document.querySelector('#results-count').textContent = 'Consultant profiles could not be loaded.';
    grid.innerHTML = '<p class="error-message">We could not load the profiles. Reload the page to try again.</p>';
  }
}
init();

function addedBadge(person) {
  const label = additions.badgeLabel(person);
  return label ? `<p class="added-badge"><span aria-hidden="true">●</span>${esc(label)}</p>` : '';
}

function renderNewProfiles() {
  state.newGroup = additions.latestGroup(state.consultants);
  document.querySelector('#new-profiles').hidden = !state.newGroup;
  if (!state.newGroup) { state.onlyNew = false; return; }
  const { date, people } = state.newGroup;
  const when = date === additions.todayKey() ? `today, ${additions.formatDate(date)}` : additions.formatDate(date);
  document.querySelector('#new-profiles-description').textContent = `${people.length} ${people.length === 1 ? 'consultant' : 'consultants'} added ${when}`;
  const button = document.querySelector('#show-new-profiles');
  button.setAttribute('aria-pressed', String(state.onlyNew));
  button.textContent = state.onlyNew ? 'Show all profiles' : 'View new profiles';
}

document.querySelector('#show-new-profiles').addEventListener('click', () => {
  const showNew = !state.onlyNew;
  state.query = ''; state.technology = ''; state.onlyNew = showNew;
  search.value = ''; technology.value = '';
  renderResults();
  grid.focus({ preventScroll: true });
});

document.querySelector('#download-new-cvs').addEventListener('click', async () => {
  const group = additions.latestGroup(state.consultants);
  if (!group) return;
  const button = document.querySelector('#download-new-cvs');
  const status = document.querySelector('#new-download-status');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  status.textContent = 'Preparing new CVs …';
  try {
    const entries = await Promise.all(group.people.map(async person => {
      let bytes;
      if (location.protocol === 'file:') {
        const encoded = window.KNOWIT_CV_DATA?.[person.id];
        if (!encoded) throw new Error('CV unavailable');
        bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      } else {
        const response = await fetch(person.cv, { cache: 'no-store' });
        if (!response.ok) throw new Error('CV unavailable');
        bytes = new Uint8Array(await response.arrayBuffer());
      }
      if (bytes.length !== person.cvBytes) throw new Error('Incomplete CV');
      return { name: person.cvName, bytes };
    }));
    const url = URL.createObjectURL(new Blob([additions.createZip(entries)], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url; link.download = `Knowit_New_CVs_${group.date}.zip`; link.hidden = true;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = `Download started: ${entries.length} ${entries.length === 1 ? 'CV' : 'CVs'} in one ZIP file.`;
  } catch (error) {
    status.textContent = 'We could not prepare all new CVs. Please try again or download each CV from its profile.';
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
});

// Refresh date-sensitive labels when a page is left open overnight.
let displayedDay = additions.todayKey();
function refreshAdditionDate() {
  const day = additions.todayKey();
  if (day !== displayedDay) {
    displayedDay = day;
    renderResults();
    if (dialog.open) {
      const person = state.consultants.find(item => item.id === state.profileId);
      const badge = document.querySelector('#profile-content .added-badge');
      if (person && badge) badge.innerHTML = `<span aria-hidden="true">●</span>${esc(additions.badgeLabel(person))}`;
    }
  }
}
document.addEventListener('visibilitychange', refreshAdditionDate);
setInterval(refreshAdditionDate, 60000);
