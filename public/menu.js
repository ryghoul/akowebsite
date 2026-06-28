/* =========================================================
   menu.js — clickable rows + modal
   ========================================================= */

const MENU_IMAGES = {
  'sticky-rice':      'Pictures/menu/current/srpt.JPG',
  'milk-tea':         'Pictures/menu/current/mt.png',
  'yuja-ade':         'Pictures/menu/current/yj.png',
  'matcha-latte':     'Pictures/menu/current/aml.JPG',
  'strawberry-fizz':  'Pictures/menu/current/strawberry-fizz.jpg',
  'matcha-cortdo':    'Pictures/menu/current/aml.JPG',
  'matcha-tea':       'Pictures/menu/current/aml.JPG',
  'matcha-ade':       'Pictures/menu/current/aml.JPG',
  /*ARCHIVE*/
// Archive — Main
'lychee-black-tea':       'Pictures/menu/archive/lychee-black-tea.jpg',
'hojicha-latte':          'Pictures/menu/archive/hojicha-latte.jpg',
'rooibos-tea':            'Pictures/menu/archive/rooibos-tea.jpg',
'bittersweet-kiss':       'Pictures/menu/archive/bittersweet-kiss.jpg',
'sweet-dreams':           'Pictures/menu/archive/sweet-dreams.jpg',
'campfires-marshmallows': 'Pictures/menu/archive/campfires-marshmallows.jpg',
'coffee':                 'Pictures/menu/archive/coffee.jpg',
'campfires-2':            'Pictures/menu/archive/campfires-2.jpg',
// Archive — Ikebana Alcohol Night
'chuhai':                 'Pictures/menu/archive/ikebana/chuhai.jpg',
'matcha-martini':         'Pictures/menu/archive/ikebana/matcha-martini.jpg',
'jasmine-cocktail':       'Pictures/menu/archive/ikebana/jasmine-cocktail.jpg',
// Archive — Miscellaneous
'lychee-aloe-martini':    'Pictures/menu/archive/misc/lychee-aloe-martini.png',
'na-margarita':           'Pictures/menu/archive/misc/na-margarita.png',
'coffee-bourbon-soy':     'Pictures/menu/archive/misc/coffee-bourbon-soy.png',
'grapefruit-curacao':     'Pictures/menu/archive/misc/grapefruit-curacao.png',
'yuja-schisandra':        'Pictures/menu/archive/misc/yuja-schisandra.png',
'perilla-jeju':           'Pictures/menu/archive/misc/perilla-jeju.png',
'clarified-coffee':       'Pictures/menu/archive/misc/clarified-coffee.png',
'matcha-jasmine-cream':   'Pictures/menu/archive/misc/matcha-jasmine-cream.png',
'orange-chai':            'Pictures/menu/archive/misc/orange-chai.png',
'shaken-jasmine-jeju':    'Pictures/menu/archive/misc/shaken-jasmine-jeju.png',
'misugaru-mocha':         'Pictures/menu/archive/misc/misugaru-mocha.png', 
};

const MENU_DATA = {
  'sticky-rice':      { num:'#01', cat:'Special',          name:'"Sticky Rice" Pureh Tea',         ingredients:['2019 Puerh Tea','Oat Milk','Brown Sugar', 'Mango Stick'],                                             profile:{Silky:4,Malty:5,Sweet:4},      note:'Earthy puerh layered with toasted rice warmth and creamy oat texture. The mango stick softens the finish with a subtle tropical sweetness.' },
  'milk-tea':         { num:'#02', cat:'Special',          name:'Milk Tea - Red Tea',              ingredients:['Jin Hao Red Tea','Brown Sugar','Salted Vanilla Cream', 'Nutmeg'],                                     profile:{Nutty:3,Chocolate:4,Creamy:4}, note:'Deep red tea balanced with brown sugar and a salted vanilla cream top. Smooth, rich, and comforting with a warm spice finish.' },
  'yuja-ade':         { num:'#03', cat:'Special',          name:'Yuja Ade',                        ingredients:['Yuzu and Honey Marmalade','Calamansi','Sparkling', 'Mint'],                                           profile:{Citrus:5,Sweet:4,Light:5},     note:'Bright yuzu and calamansi lifted with sparkling citrus and cooling mint. Sweet, sharp, and refreshing from the first sip.' },
  'matcha-latte':     { num:'#04', cat:'Special',          name:'Matcha Latte',                    ingredients:['Uji Sourced Matcha','Minor Figures Oat Milk','Brown Sugar'],                                          profile:{Velvety:4,Smoth:4,Rich:5},     note:'Stone-ground Uji matcha whisked smooth with oat milk and brown sugar. Rich, creamy, and balanced with a clean grassy finish.' },
  'strawberry-fizz':  { num:'#05', cat:'Seasonal',         name:'Strawberry Fizz',                 ingredients:['42 HR Strawberry Syrup','Calamansi','Sparkling Yuzu and Calamansi Foam', 'Macerated Strawberries'],   profile:{Fruity:4,Bright:5,Sweet:3},    note:'House strawberry syrup shaken with calamansi and topped with sparkling citrus foam. Fruity, fizzy, and made for warm afternoons.' },
  'matcha-cortdo':    { num:'#06', cat:'Matcha',           name:'Matcha Cortdo',                   ingredients:['Uji Sourced Matcha'],                                                                                 profile:{Delicate:5,Smooth:4,Sweet:3},   note:'A concentrated matcha drink with bold roasted depth and a velvety body. Small, smooth, and quietly intense.' },
  'matcha-tea':       { num:'#07', cat:'Matcha',           name:'Matcha Tea',                      ingredients:['Uji Sourced Matcha'],                                                                                 profile:{Classic:5,Sweet:4,Light:5},    note:'Pure ceremonial-grade matcha prepared traditionally. Clean vegetal notes with a naturally sweet and lingering finish.' },
  'matcha-ade':       { num:'#08', cat:'Matcha',           name:'Matcha Calamansi Ade',            ingredients:['Uji Sourced Matcha','Calamansi'],                                                                     profile:{Bold:4,Sweet:4,Crisp:5},    note:'Bright calamansi citrus layered beneath smooth Uji matcha. Refreshing, vibrant, and slightly sweet with a crisp finish.' },
  /*ARCHIVE*/
// Archive — Main
'lychee-black-tea':       { num:'#A1', cat:'Archive', name:'Lychee "Infused" Black Tea',        ingredients:['Real Lychee Fruit (Smoked & Infused)','Congou Black Tea'],                                              profile:{Fruity:5,Sweet:4,Floral:4},      note:'Real lychee fruit smoked and infused directly into the congou black tea, naturally sweetening and flavoring the leaves with a delicate fruity note.' },
'hojicha-latte':          { num:'#A2', cat:'Archive', name:'Hojicha Latte',                     ingredients:['Shirawake Uji Hojicha','Oat Milk','Brown Sugar'],                                                       profile:{Roasted:5,Nutty:4,Chocolatey:4}, note:'A roasted hojicha from Shirawake, Uji — the chocolatey, nutty, and woody counterpart to our beloved matcha lattes.' },
'rooibos-tea':            { num:'#A3', cat:'Archive', name:'Rooibos Tea',                       ingredients:['African Rooibos'],                                                                                      profile:{Earthy:4,Nutty:3,Citrus:3},      note:'A caffeine-free African tea with refreshing, nutty, and earthy tones. Notes of citrus, sage, and honey.' },
'bittersweet-kiss':       { num:'#A4', cat:'Archive', name:'Bittersweet Kiss',                  ingredients:['Rooibos Concentrate','Orange Oil','Lemon','Aperitif','Zero Proof Gin'],                                 profile:{Bitter:4,Citrus:4,Complex:5},    note:"AKO's first non-alcoholic mocktail — a play on a feeling. A rooibos base with orange oil, lemon, aperitif, and zero proof gin." },
'sweet-dreams':           { num:'#A5', cat:'Archive', name:'Sweet Dreams',                      ingredients:['Roasted Tie Guan Yin Concentrate','Brown Sugar','Vanilla','Sparkling Water'],                           profile:{Roasty:4,Nutty:4,Sweet:4},       note:'An oolong cream soda. A carbonated tea highball with roasty and nutty notes from a Tie Guan Yin concentrate, brown sugar, and vanilla.' },
'campfires-marshmallows': { num:'#A6', cat:'Archive', name:'Campfires and Marshmallows',        ingredients:['Smoked Black Tea','Wuyi Oolong Infused Cream','Toffee Crumble'],                                        profile:{Smoky:5,Sweet:4,Woody:4},        note:'A smoked black tea base with a wuyi oolong cream top and toffee crumble. Evokes an open fire and pine wood with marshmallows roasting over the flame.' },
'coffee':                 { num:'#A7', cat:'Archive', name:'"Coffee"',                          ingredients:['Bori-cha (Barley Tea)','Hyeonmi-cha (Brown Rice Tea)'],                                                 profile:{Roasted:5,Nutty:4,Familiar:5},   note:'A Korean-inspired blend of bori-cha and hyeonmi-cha prepared like a pour-over. All the iconic coffee taste and aroma — zero caffeine.' },
'campfires-2':            { num:'#A8', cat:'Archive', name:'Campfires 2.0',                     ingredients:['Lapsang Souchong','Wuyi Oolong Foam','Toffee Crumble'],                                                 profile:{Smoky:4,Calming:5,Sweet:3},      note:'An evolved take on Campfires and Marshmallows. Swapping the cream top for an oolong foam transforms it from heavy and smoky-sweet to quietly sitting by the fireplace.' },

// Archive — Ikebana Alcohol Night 2025
'chuhai':                 { num:'#B1', cat:'Ikebana — Alcohol Night 2025', name:'Chuhai',                ingredients:['Oolong Infused Barley Shochu','Club Soda'],                                                      profile:{Light:4,Crisp:5,Roasted:3},      note:'An adaptation of an oolong hai. Oolong-infused barley shochu topped with club soda — simple, refreshing, and quietly complex.' },
'matcha-martini':         { num:'#B2', cat:'Ikebana — Alcohol Night 2025', name:'Matcha',                ingredients:['Uji Matcha','Licor 43','Haku Vodka','Cream','Egg Whites'],                                        profile:{Rich:5,Decadent:5,Sweet:4},      note:"AKO's take on a matcha martini with a touch of chocolate. Matcha, Licor 43, Haku vodka, cream, and egg whites — decadent and rich." },
'jasmine-cocktail':       { num:'#B3', cat:'Ikebana — Alcohol Night 2025', name:'Jasmine',               ingredients:['Jasmine Milk Tea','Roku Gin','Lychee','Fresh Lemon Juice'],                                       profile:{Floral:5,Silky:5,Citrus:3},      note:'A clarified cocktail that captures the silky feeling of a milk tea with a jasmine green tea aroma. Playing off a classic, nostalgic milk tea.' },

// Archive — Miscellaneous
'lychee-aloe-martini':    { num:'#C1',  cat:'Miscellaneous', name:'Lychee Aloe N/A Martini',              ingredients:['Lychee','Aloe'],                                             profile:{Floral:4,Light:4,Sweet:4},    note:'' },
'na-margarita':           { num:'#C2',  cat:'Miscellaneous', name:'N/A Margarita',                        ingredients:[],                                                           profile:{Citrus:5,Tart:4,Crisp:4},     note:'' },
'coffee-bourbon-soy':     { num:'#C3',  cat:'Miscellaneous', name:'Coffee & N/A Bourbon with Soy Foam',   ingredients:['Coffee','N/A Bourbon','Soy Sauce Foam'],                    profile:{Bold:5,Umami:4,Roasted:4},    note:'' },
'grapefruit-curacao':     { num:'#C4',  cat:'Miscellaneous', name:'Grapefruit & Blue Curaçao Spritz',     ingredients:['Grapefruit','Blue Curaçao'],                                profile:{Citrus:5,Bright:4,Fizzy:4},   note:'' },
'yuja-schisandra':        { num:'#C5',  cat:'Miscellaneous', name:'Yuja & Schisandra Berry Tonic',        ingredients:['Yuzu','Schisandra Berry','Tonic'],                          profile:{Tart:4,Floral:4,Complex:5},   note:'' },
'perilla-jeju':           { num:'#C6',  cat:'Miscellaneous', name:'Shaken Perilla Leaf Jeju Green Tea',   ingredients:['Perilla Leaf','Jeju Green Tea'],                            profile:{Herbal:5,Fresh:4,Light:4},    note:'' },
'clarified-coffee':       { num:'#C7',  cat:'Miscellaneous', name:'Clarified Coffee',                     ingredients:['Clarified Coffee','Rose','Nutmeg Cream'],                  profile:{Roasted:5,Floral:3,Creamy:4}, note:'' },
'matcha-jasmine-cream':   { num:'#C8',  cat:'Miscellaneous', name:'Matcha & Jasmine Cream Top',           ingredients:['Matcha','Jasmine Infused Cream'],                           profile:{Floral:5,Smooth:4,Sweet:3},   note:'' },
'orange-chai':            { num:'#C9',  cat:'Miscellaneous', name:'Brown Sugar & Orange Spiced Chai',     ingredients:['Chai','Brown Sugar','Orange'],                              profile:{Spiced:5,Sweet:4,Warm:5},     note:'' },
'shaken-jasmine-jeju':    { num:'#C10', cat:'Miscellaneous', name:'Shaken Jasmine Jeju Green Tea',        ingredients:['Jasmine','Jeju Green Tea'],                                 profile:{Floral:5,Light:4,Crisp:4},    note:'' },
'misugaru-mocha':         { num:'#C11', cat:'Miscellaneous', name:'Smoked Misugaru Mocha',                ingredients:['Misugaru','Smoked Base','Mocha'],                           profile:{Smoky:4,Nutty:5,Rich:4},      note:'' },         
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

// ── Archive toggle ──
const archiveToggle  = document.getElementById('archiveToggle');
const archiveSection = document.getElementById('archiveSection');

archiveToggle.addEventListener('click', () => {
  const isOpen = archiveSection.classList.toggle('open');
  archiveToggle.setAttribute('aria-expanded', isOpen);
});