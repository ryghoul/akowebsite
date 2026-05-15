/* =========================================================
   menu.js — clickable rows + modal
   ========================================================= */

const MENU_IMAGES = {
  'sticky-rice':      'Pictures/menu/current/srpt.jpg',
  'milk-tea':         'Pictures/menu/current/mt.png',
  'yuja-ade':         'Pictures/menu/current/yj.png',
  'matcha-latte':     'Pictures/menu/current/aml.jpg',
  'strawberry-fizz':  'Pictures/menu/current/strawberry-fizz.jpg',
  'matcha-cortdo':    'Pictures/menu/current/aml.jpg',
  'matcha-tea':       'Pictures/menu/current/aml.jpg',
  'matcha-ade':       'Pictures/menu/current/aml.jpg'  
};

const MENU_DATA = {
  'sticky-rice':      { num:'#01', cat:'Special',          name:'"Sticky Rice" Pureh Tea',         price:'$7.50', ingredients:['2019 Puerh Tea','Oat Milk','Brown Sugar', 'Mango Stick'],                                             profile:{Silky:4,Malty:5,Sweet:4},      note:'Earthy puerh layered with toasted rice warmth and creamy oat texture. The mango stick softens the finish with a subtle tropical sweetness.' },
  'milk-tea':         { num:'#02', cat:'Special',          name:'Milk Tea - Red Tea',              price:'$7.50', ingredients:['Jin Hao Red Tea','Brown Sugar','Salted Vanilla Cream', 'Nutmeg'],                                     profile:{Nutty:3,Chocolate:4,Creamy:4}, note:'Deep red tea balanced with brown sugar and a salted vanilla cream top. Smooth, rich, and comforting with a warm spice finish.' },
  'yuja-ade':         { num:'#03', cat:'Special',          name:'Yuja Ade',                        price:'$7.00', ingredients:['Yuzu and Honey Marmalade','Calamansi','Sparkling', 'Mint'],                                           profile:{Citrus:5,Sweet:4,Light:5},     note:'Bright yuzu and calamansi lifted with sparkling citrus and cooling mint. Sweet, sharp, and refreshing from the first sip.' },
  'matcha-latte':     { num:'#04', cat:'Special',          name:'Matcha Latte',                    price:'$7.50', ingredients:['Uji Sourced Matcha','Minor Figures Oat Milk','Brown Sugar'],                                          profile:{Velvety:4,Smoth:4,Rich:5},     note:'Stone-ground Uji matcha whisked smooth with oat milk and brown sugar. Rich, creamy, and balanced with a clean grassy finish.' },
  'strawberry-fizz':  { num:'#05', cat:'Seasonal',         name:'Strawberry Fizz',                 price:'$8.00', ingredients:['42 HR Strawberry Syrup','Calamansi','Sparkling Yuzu and Calamansi Foam', 'Macerated Strawberries'],   profile:{Fruity:4,Bright:5,Sweet:3},    note:'House strawberry syrup shaken with calamansi and topped with sparkling citrus foam. Fruity, fizzy, and made for warm afternoons.' },
  'matcha-cortdo':    { num:'#06', cat:'Matcha',           name:'Matcha Cortdo',                   price:'$6.00', ingredients:['Uji Sourced Matcha'],                                                                                 profile:{Delicate:5,Smooth:4,Sweet:3},   note:'A concentrated matcha drink with bold roasted depth and a velvety body. Small, smooth, and quietly intense.' },
  'matcha-tea':       { num:'#07', cat:'Matcha',           name:'Matcha Tea',                      price:'$5.50', ingredients:['Uji Sourced Matcha'],                                                                                 profile:{Classic:5,Sweet:4,Light:5},    note:'Pure ceremonial-grade matcha prepared traditionally. Clean vegetal notes with a naturally sweet and lingering finish.' },
  'matcha-ade':       { num:'#08', cat:'Matcha',           name:'Matcha Calamansi Ade',            price:'$6.50', ingredients:['Uji Sourced Matcha','Calamansi'],                                                                     profile:{Bold:4,Sweet:4,Crisp:5},    note:'Bright calamansi citrus layered beneath smooth Uji matcha. Refreshing, vibrant, and slightly sweet with a crisp finish.' },
};

function buildDots(level, max = 5) {
  return Array.from({ length: max }, (_, i) =>
    `<span class="dot${i < level ? '' : ' empty'}"></span>`
  ).join('');
}

const overlay    = document.getElementById('modalOverlay');
const modalImg   = document.getElementById('modalImg');
const modalNum   = document.getElementById('modalNum');
const modalCat   = document.getElementById('modalCat');
const modalName  = document.getElementById('modalName');
const modalPrice = document.getElementById('modalPrice');
const modalGrid  = document.getElementById('modalGrid');
const modalNote  = document.getElementById('modalNote');
const closeBtn   = document.getElementById('modalClose');

function openModal(id) {
  const d = MENU_DATA[id];
  if (!d) return;

  modalImg.src          = MENU_IMAGES[id] || '';
  modalImg.alt          = d.name;
  modalNum.textContent  = d.num;
  modalCat.textContent  = d.cat;
  modalName.textContent = d.name;
  modalPrice.textContent= d.price;
  modalNote.textContent = d.note;

  modalGrid.innerHTML = `
    <div>
      <div class="modal-field-label">Ingredients</div>
      <div class="modal-field-val">${d.ingredients.join('<br>')}</div>
    </div>
    <div>
      <div class="modal-field-label">Profile</div>
      ${Object.entries(d.profile).map(([k, v]) => `
        <div class="modal-profile-row">
          <span class="modal-profile-key">${k}</span>
          <span class="modal-dots">${buildDots(v)}</span>
        </div>`).join('')}
    </div>`;

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.querySelectorAll('.mrow').forEach(row => {
  row.addEventListener('click', () => openModal(row.dataset.id));
});

closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });