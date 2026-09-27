/* ---------- DATA & STATE ---------- */
const SCREENS = [
  "screen-login","screen-location","screen-types","screen-weights","screen-prices",
  "screen-edu-process","screen-edu-usage","screen-platforms","screen-external","screen-done"
];

const SCRAP_TYPES = [
  { key:"plastic", label:"Plastic", base:18 },
  { key:"glass", label:"Glass", base:3 },
  { key:"electronics", label:"Electronics", base:60 },
  { key:"paper", label:"Paper", base:12 },
  { key:"metal", label:"Metal", base:40 }
];

const PLATFORMS = [
  { id:"scrapeco", name:"ScrapEco", site:"https://example.com/scrapeco",
    coverage:["Mumbai","Pune","Delhi","Bengaluru","Hyderabad","Kolkata","Chennai"],
    mult:{ plastic:1.05, glass:1.1, electronics:1.00, paper:1.05, metal:1.03 } },

  { id:"kabadiwala", name:"Kabadiwala", site:"https://example.com/kabadiwala",
    coverage:["Mumbai","Delhi","Bengaluru","Hyderabad","Kolkata"],
    mult:{ plastic:1.00, glass:1.00, electronics:1.08, paper:1.00, metal:1.06 } },

  { id:"recyclekart", name:"RecycleKart", site:"https://example.com/recyclekart",
    coverage:["Pune","Delhi","Bengaluru","Hyderabad","Chennai"],
    mult:{ plastic:1.02, glass:1.15, electronics:0.98, paper:1.02, metal:1.04 } },

  { id:"greenbins", name:"GreenBins", site:"https://example.com/greenbins",
    coverage:["Mumbai","Pune","Delhi","Bengaluru","Hyderabad","Kolkata","Chennai","Other"],
    mult:{ plastic:1.07, glass:1.05, electronics:1.03, paper:1.01, metal:1.02 } }
];

const state = {
  step:0,
  auth:{email:""},
  location:{city:"",pincode:"",address:""},
  typesSelected:new Set(),
  weights:{},
  quotes:[],
  chosenPlatformId:null,
  saleRecord:null
};


/* ---------- HELPERS ---------- */
const $=(s,r=document)=>r.querySelector(s);

const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

function showStep(i){
  state.step=Math.max(0,Math.min(SCREENS.length-1,i));

  SCREENS.forEach((id,idx)=>
    document.getElementById(id).classList.toggle('hidden',idx!==state.step)
  );

  $("#progressBar").style.width=
    (state.step/(SCREENS.length-1)*100)+"%";

  renderDots();
}

function renderDots(){
  const box=$("#stepsDots");
  box.innerHTML="";

  SCREENS.forEach((_,i)=>{
    const d=document.createElement('div');
    d.className='dot'+(i===state.step?' active':'');
    box.appendChild(d);
  });
}

function toast(msg){
  const t=document.createElement('div');
  t.textContent=msg;

  Object.assign(t.style,{
    position:'fixed',
    left:'50%',
    transform:'translateX(-50%)',
    bottom:'24px',
    background:'rgba(2,6,23,.9)',
    color:'#fff',
    border:'1px solid rgba(148,163,184,.25)',
    padding:'10px 14px',
    borderRadius:'12px',
    zIndex:9999
  });

  document.body.appendChild(t);

  setTimeout(()=>t.remove(),2000);
}

const fmtMoney=x=>Math.round(x).toLocaleString('en-IN');

const posNum=v=>{
  const n=parseFloat(v);
  return (isFinite(n)&&n>=0)?n:0
};


/* ---------- LOGIN ---------- */
$("#btnDemo").addEventListener('click',()=>{
  $("#loginEmail").value="demo@user.com";
  $("#loginPass").value="password";
  toast("Demo credentials filled");
});

$("#btnLogin").addEventListener('click',()=>{
  const email=$("#loginEmail").value.trim();
  const pass=$("#loginPass").value.trim();

  if(!email||!pass){
    toast("Enter email and password");
    return;
  }

  state.auth.email=email;

  localStorage.setItem("scrap_auth_email",email);

  showStep(1);
});


/* ---------- GENERIC NAV ---------- */
$$("[data-next]").forEach(b=>b.addEventListener('click',()=>{

  if(state.step===1){

    const city=$("#city").value.trim();
    const pin=$("#pincode").value.trim();
    const addr=$("#address").value.trim();

    if(!city){
      toast("Select city");
      return;
    }

    if(pin && !/^\d{6}$/.test(pin)){
      toast("Enter valid 6-digit pincode");
      return;
    }

    state.location={
      city,
      pincode:pin,
      address:addr
    };

    localStorage.setItem(
      "scrap_location",
      JSON.stringify(state.location)
    );
  }

  if(state.step===2){

    if(state.typesSelected.size===0){
      toast("Select at least one type");
      return;
    }

    renderWeightsInputs();
  }

  if(state.step===3){

    let ok=false;
    state.weights={};

    state.typesSelected.forEach(k=>{
      const v=posNum($(`#wt_${k}`).value);

      if(v>0) ok=true;

      state.weights[k]=v;
    });

    if(!ok){
      toast("Enter at least one weight > 0");
      return;
    }

    computeQuotes();
    renderQuotesTable();
  }

  showStep(state.step+1);
}));


$$("[data-prev]").forEach(b=>
  b.addEventListener('click',()=>showStep(state.step-1))
);


/* ---------- GEO ---------- */
/* ---------- GOOGLE MAP + GPS ---------- */

const mapBox = $("#mapBox");
const mapFrame = $("#mapFrame");
const mapSearch = $("#mapSearch");

$("#btnGeo").addEventListener("click", () => {

  if (!navigator.geolocation) {
    toast("GPS is not supported by this browser");
    return;
  }

  toast("Getting your location...");

  navigator.geolocation.getCurrentPosition(
    (position) => {

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      $("#address").value =
        `GPS Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      mapBox.classList.remove("hidden");

      mapFrame.src =
        `https://www.google.com/maps?q=${lat},${lng}&output=embed`;

      toast("Your GPS location is shown on the map");

    },
    () => {
      toast("Location permission denied or unavailable");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});


$("#btnMapSearch").addEventListener("click", () => {

  const query = mapSearch.value.trim();

  if (!query) {
    toast("Enter a location to search");
    return;
  }

  mapFrame.src =
    `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  mapBox.classList.remove("hidden");

  toast("Location searched");

});


$("#mapSearch").addEventListener("keydown", (event) => {

  if (event.key === "Enter") {
    event.preventDefault();
    $("#btnMapSearch").click();
  }

});


$("#btnCloseMap").addEventListener("click", () => {
  mapBox.classList.add("hidden");
});


$("#btnOpenGoogleMaps").addEventListener("click", () => {

  const query = mapSearch.value.trim();

  if (query) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
      "_blank"
    );
  } else {
    window.open(
      "https://www.google.com/maps",
      "_blank"
    );
  }

});


/* ---------- TYPES ---------- */
const typeChips=$("#typeChips");

SCRAP_TYPES.forEach(t=>{

  const c=document.createElement('div');

  c.className='chip';
  c.textContent=t.label;
  c.dataset.key=t.key;
  c.title=`Base ~₹${t.base}/kg`;

  c.addEventListener('click',()=>{

    if(state.typesSelected.has(t.key)){

      state.typesSelected.delete(t.key);
      c.classList.remove('selected');

    }else{

      state.typesSelected.add(t.key);
      c.classList.add('selected');

    }

  });

  typeChips.appendChild(c);
});

$("#btnTypesNext").addEventListener('click',()=>{
  if(state.typesSelected.size===0)
    toast("Select at least one type");
});


/* ---------- WEIGHTS UI ---------- */
function renderWeightsInputs(){

  const box=$("#weightsContainer");

  box.innerHTML="";

  [...state.typesSelected].forEach(key=>{

    const meta=SCRAP_TYPES.find(s=>s.key===key);

    const wrap=document.createElement('div');

    wrap.className='field';

    wrap.innerHTML=
      `<label>${meta.label} (kg)</label>
       <input type="number" min="0" step="0.1"
       id="wt_${key}" placeholder="e.g., 2.5" />`;

    box.appendChild(wrap);
  });
}


/* ---------- PRICING ---------- */
function computeQuotes(){

  const totalKg=
    Object.values(state.weights)
    .reduce((a,b)=>a+(parseFloat(b)||0),0);

  const city=state.location.city||"Other";

  const rows=PLATFORMS.map(p=>{

    let total=0;
    let breakdown=[];

    for(const [key,kg] of Object.entries(state.weights)){

      const meta=SCRAP_TYPES.find(s=>s.key===key);
      const base=meta?.base??0;
      const mult=p.mult[key]??1;
      const amt=kg*base*mult;

      if(kg>0){

        breakdown.push(
          `${meta.label}: ₹${fmtMoney(kg*base)} × ${mult.toFixed(2)} = ₹${fmtMoney(amt)}`
        );

      }

      total+=amt;
    }

    return {
      platformId:p.id,
      name:p.name,
      site:p.site,
      covered:p.coverage.includes(city),
      breakdown,
      total,
      city
    };

  }).sort((a,b)=>b.total-a.total);

  state.quotes=rows;

  $("#summaryBadge").textContent=
    `${totalKg.toFixed(2)} kg • ₹${fmtMoney(
      rows.reduce((m,r)=>Math.max(m,r.total),0)
    )} (max)`;
}


function renderQuotesTable(){

  const body=$("#pricesBody");

  body.innerHTML="";

  state.chosenPlatformId=null;

  state.quotes.forEach((q,idx)=>{

    const tr=document.createElement('tr');

    const td0=document.createElement('td');

    td0.innerHTML=
      `<input type="radio" name="choosePlatform"
      ${idx===0?'checked':''} />`;

    td0.querySelector('input').addEventListener(
      'change',
      ()=>state.chosenPlatformId=q.platformId
    );

    if(idx===0)
      state.chosenPlatformId=q.platformId;


    const td1=document.createElement('td');

    td1.innerHTML=
      `<div class="between">
        <strong>${q.name}</strong>
        <span class="pill">
          ${idx===0?'Highest':'Rank '+(idx+1)}
        </span>
      </div>
      <div class="footnote mt-12">
        URL: ${q.site}
      </div>`;


    const td2=document.createElement('td');

    td2.innerHTML=q.covered
      ? `<span class="ok">Covers ${q.city}</span>`
      : `<span class="bad">No direct coverage</span>`;


    const td3=document.createElement('td');

    td3.innerHTML=q.breakdown.length
      ? q.breakdown
          .map(b=>`<div class="footnote">${b}</div>`)
          .join("")
      : `<span class="footnote">No items</span>`;


    const td4=document.createElement('td');

    td4.innerHTML=
      `<strong>₹${fmtMoney(q.total)}</strong>`;


    [td0,td1,td2,td3,td4]
      .forEach(td=>tr.appendChild(td));

    body.appendChild(tr);
  });
}


/* ---------- EDUCATION NAV ---------- */
$("#btnLearn").addEventListener(
  'click',
  ()=>showStep(5)
);

$("#btnBackToPrices1").addEventListener(
  'click',
  ()=>showStep(4)
);

$("#btnLearnNext").addEventListener(
  'click',
  ()=>showStep(6)
);

$("#btnBackToProcess").addEventListener(
  'click',
  ()=>showStep(5)
);

$("#btnBackToPrices2").addEventListener(
  'click',
  ()=>showStep(4)
);


/* ---------- GO TO PLATFORM SELECT ---------- */
$("#btnGoSelect").addEventListener('click',()=>{

  buildPlatformCards();

  showStep(7);
});

$("#btnBackToPrices3").addEventListener(
  'click',
  ()=>showStep(4)
);


function buildPlatformCards(){

  const box=$("#platformCards");

  box.innerHTML="";

  state.quotes.forEach((q,idx)=>{

    const card=document.createElement('div');

    card.className='card';

    card.innerHTML=`
      <div class="between">

        <div>
          <h3 style="margin:0">${q.name}</h3>

          <div class="footnote">
            ${q.covered
              ? `Covers ${q.city}`
              : `Coverage not direct in ${q.city}`}
          </div>
        </div>

        <div>
          <span class="pill">
            Total ₹${fmtMoney(q.total)}
          </span>
        </div>

      </div>

      <div class="mt-12 footnote">
        ${
          q.breakdown.length
            ? q.breakdown.map(b=>`<div>${b}</div>`).join("")
            : "No line items"
        }
      </div>

      <div class="row mt-16">

        <button class="btn ghost slim"
          data-open="${q.platformId}">
          Open ${q.name}
        </button>

        ${
          idx===0
            ? '<span class="pill">Top Value</span>'
            : ''
        }

      </div>
    `;

    box.appendChild(card);
  });


  $$('[data-open]').forEach(btn=>{

    btn.addEventListener('click',()=>{

      const agreed=$("#agreePolicy").checked;

      if(!agreed){

        toast(
          "Please check the About Selling agreement to proceed."
        );

        return;
      }

      const pid=btn.getAttribute('data-open');

      openPlatformById(pid);
    });

  });
}


/* ---------- OPEN PLATFORM ---------- */
function openPlatformById(pid){

  const q=
    state.quotes.find(x=>x.platformId===pid)
    || state.quotes[0];

  state.chosenPlatformId=q.platformId;

  const params=new URLSearchParams({

    email:state.auth.email,
    city:state.location.city,
    pincode:state.location.pincode,
    address:state.location.address,
    weights:JSON.stringify(state.weights),
    total:Math.round(q.total).toString()

  }).toString();

  window.open(
    `${q.site}?${params}`,
    "_blank",
    "noopener,noreferrer"
  );

  showStep(8);
}


$("#btnOpenSelected").addEventListener('click',()=>{

  if(!$("#agreePolicy").checked){

    toast(
      "Please check the About Selling agreement to proceed."
    );

    return;
  }

  const chosen=
    state.chosenPlatformId
    || (state.quotes[0]?.platformId);

  if(!chosen){

    toast(
      "Select a platform (use the cards above)"
    );

    return;
  }

  openPlatformById(chosen);
});


/* ---------- EXTERNAL → RECEIPT ---------- */
$("#btnMarkSold").addEventListener('click',()=>{

  const chosen=
    state.chosenPlatformId
    || (state.quotes[0]?.platformId);

  const q=
    state.quotes.find(x=>x.platformId===chosen);

  const now=new Date();

  state.saleRecord={

    id:
      "SC-"+
      Math.random()
        .toString(36)
        .slice(2,8)
        .toUpperCase(),

    when:now.toLocaleString('en-GB'),

    email:state.auth.email,

    location:state.location,

    weights:state.weights,

    platform:q?.name||"N/A",

    amount:Math.round(q?.total||0)

  };

  renderReceipt();

  showStep(9);
});


function renderReceipt(){

  const r=state.saleRecord;

  const box=$("#receipt");

  box.innerHTML="";


  const L=document.createElement('div');

  L.className='card';

  L.innerHTML=`
    <div class="footnote">
      Receipt ID
    </div>

    <div style="font-weight:800; font-size:18px">
      ${r.id}
    </div>

    <div class="mt-12">
      <span class="footnote">
        Date & Time
      </span>
      <br>
      ${r.when}
    </div>

    <div class="mt-12">
      <span class="footnote">
        Buyer Platform
      </span>
      <br>
      <strong>${r.platform}</strong>
    </div>

    <div class="mt-12">
      <span class="footnote">
        Total Amount
      </span>
      <br>
      <strong>₹${fmtMoney(r.amount)}</strong>
    </div>
  `;


  const R=document.createElement('div');

  R.className='card';


  const items=
    Object.entries(r.weights)
      .filter(([k,v])=>
        (parseFloat(v)||0)>0
      )
      .map(([k,v])=>{

        const label=
          SCRAP_TYPES.find(
            s=>s.key===k
          )?.label||k;

        return `
          <div class="between">
            <span>${label}</span>
            <span>
              ${parseFloat(v).toFixed(2)} kg
            </span>
          </div>
        `;

      })
      .join("");


  R.innerHTML=`
    <div class="footnote">
      Sold by
    </div>

    <div>
      <strong>${r.email}</strong>
    </div>

    <div class="mt-12">

      <div class="footnote">
        Pickup Address
      </div>

      <div>
        ${r.location.address||'-'}
      </div>

      <div>
        ${r.location.city||'-'}
        ${
          r.location.pincode
            ? ('• '+r.location.pincode)
            : ''
        }
      </div>

    </div>

    <div class="mt-12">

      <div class="footnote">
        Items
      </div>

      <div class="grid" style="gap:6px">
        ${
          items ||
          '<span class="footnote">No items</span>'
        }
      </div>

    </div>
  `;


  box.appendChild(L);

  box.appendChild(R);
}


$("#btnStartOver").addEventListener('click',()=>{

  state.step=1;

  state.typesSelected=new Set();

  state.weights={};

  state.quotes=[];

  state.chosenPlatformId=null;

  showStep(1);
});


/* ---------- INIT ---------- */
(function(){

  renderDots();

  const savedEmail=
    localStorage.getItem("scrap_auth_email");

  if(savedEmail)
    $("#loginEmail").value=savedEmail;


  const savedLoc=
    localStorage.getItem("scrap_location");

  if(savedLoc){

    try{

      const loc=JSON.parse(savedLoc);

      $("#city").value=loc.city||"";
      $("#pincode").value=loc.pincode||"";
      $("#address").value=loc.address||"";

    }catch{}

  }

})();