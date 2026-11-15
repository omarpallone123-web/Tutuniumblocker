const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let sb,user,list=[],cur=null,timer,auto=false,bound=false;
const toast=(m,e)=>{const t=document.createElement('div');t.className='toast'+(e?' err':'');t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),3200)};
const ask=m=>new Promise(r=>{$('#cm').textContent=m;const d=$('#dlg');d.returnValue='';d.onclose=()=>r(d.returnValue==='ok');d.showModal()});
const copy=async t=>{try{await navigator.clipboard.writeText(t);toast('Copied to clipboard')}catch{toast('Copy failed',1)}};
const url=id=>`${location.origin}/s/${id}`,ls=id=>`loadstring(game:HttpGet("${url(id)}"))()`;
const ago=d=>new Date(d).toLocaleString();
const KW=/(--\[\[[\s\S]*?\]\]|--[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\[\[[\s\S]*?\]\])|\b(and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while|continue)\b|\b(\d+\.?\d*)\b/g;
const hl=s=>esc(s).replace(KW,(m,c,st,k,n)=>c?`<span class=c>${m}</span>`:st?`<span class=s>${m}</span>`:k?`<span class=k>${m}</span>`:`<span class=n>${m}</span>`);
const theme=()=>document.documentElement.dataset.accent=localStorage.getItem('accent')||'purple';theme();

async function boot(){
  try{const c=window.TB;if(!c||!c.url||!c.key||c.url.startsWith('PASTE'))throw 0;sb=supabase.createClient(c.url,c.key)}
  catch{$('#app').innerHTML='<div class=center><div class=card style="max-width:420px">Apri index.html e inserisci SB_URL e SB_KEY.</div></div>';return}
  sb.auth.onAuthStateChange(ev=>{if(ev==='SIGNED_OUT')login()});
  const{data}=await sb.auth.getSession();data.session?await enter(data.session.user):login();
}
function login(msg){
  user=null;$('#app').innerHTML=`<div class=center><form class=card style="max-width:400px" id=lf><h1 class=grad style="margin:0">Tutunium Blocker</h1><p class=muted>Private Lua script manager</p>
  <label>Email</label><input type=email id=em required autocomplete=username><label>Password</label><input type=password id=pw required autocomplete=current-password>
  <p id=le style="color:#f87171">${esc(msg||'')}</p><button class=btn style="width:100%;justify-content:center">Sign in</button></form></div>`;
  $('#lf').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.textContent='Signing in…';
    const{data,error}=await sb.auth.signInWithPassword({email:$('#em').value,password:$('#pw').value});
    if(error){b.textContent='Sign in';$('#le').textContent=error.message;return}await enter(data.user)};
}
async function enter(u){
  const{data}=await sb.from('admins').select('user_id').eq('user_id',u.id);
  if(!data?.length){await sb.auth.signOut();return login('This account is not authorized.')}
  user=u;$('#app').innerHTML=`<div class=shell><nav class=side><h2 class=grad>Tutunium Blocker</h2><a href="#/" data-r="">📊 Overview</a><a href="#/scripts" data-r=scripts>📜 My Scripts</a><a href="#/new" data-r=new>➕ New</a><a href="#/settings" data-r=settings>⚙️ Settings</a></nav><main id=main></main></div>`;
  if(!bound){addEventListener('hashchange',route);bound=true}route();
}
async function load(){const{data,error}=await sb.from('scripts').select('id,name,description,enabled,version,views,created_at,updated_at').order('updated_at',{ascending:false});if(error)toast(error.message,1);list=data||[]}
async function route(){
  if(!user)return;const[,r,id]=(location.hash||'#/').slice(1).split('/');
  document.querySelectorAll('.side a').forEach(a=>a.classList.toggle('on',a.dataset.r===(r||'')||(r==='edit'&&a.dataset.r==='scripts')));
  $('#main').innerHTML='<div class=center style="min-height:50vh"><div class=spin></div></div>';
  if(r==='scripts'){await load();return scripts()}if(r==='new'){cur=null;return editor()}
  if(r==='edit'){const{data,error}=await sb.from('scripts').select('*').eq('id',id).single();if(error){toast('Script not found',1);location.hash='#/scripts';return}cur=data;return editor()}
  if(r==='settings')return settings();await load();overview();
}
function overview(){
  const act=list.filter(s=>s.enabled).length,views=list.reduce((a,s)=>a+Number(s.views),0);
  $('#main').innerHTML=`<div class="row between"><div><h1 style="margin:0">Overview</h1><span class=muted>Welcome back, ${esc(user.email)}</span></div><a class=btn href="#/new">+ Create Script</a></div>
  <div class=grid><div class="card stat"><span class=muted>Total scripts</span><b>${list.length}</b></div><div class="card stat"><span class=muted>Active</span><b>${act}</b></div><div class="card stat"><span class=muted>Disabled</span><b>${list.length-act}</b></div><div class="card stat"><span class=muted>Total loads</span><b>${views}</b></div></div>
  <div class=card><h3 style="margin-top:0">Recently modified</h3>${list.slice(0,5).map(row).join('')||empty()}</div>`;bind();
}
const empty=()=>'<div class=empty>No scripts yet.<br><br><a class=btn href="#/new">Create your first script</a></div>';
const row=s=>`<div class=item><div><a href="#/edit/${s.id}" style="color:inherit;font-weight:600;text-decoration:none">${esc(s.name)}</a> <span class="pill ${s.enabled?'':'off'}">${s.enabled?'Active':'Disabled'}</span><br><span class=muted>v${s.version} · ${s.views} loads · ${ago(s.updated_at)}</span></div>
<div class=row><button class="btn ghost sm" data-ls="${s.id}">Loadstring</button><button class="btn danger sm" data-del="${s.id}">Delete</button></div></div>`;
function bind(){document.querySelectorAll('[data-ls]').forEach(b=>b.onclick=()=>copy(ls(b.dataset.ls)));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(!await ask('Delete this script permanently? Its URL will stop working.'))return;
    const{error}=await sb.from('scripts').delete().eq('id',b.dataset.del);error?toast(error.message,1):(toast('Script deleted'),route())})}
function scripts(){
  $('#main').innerHTML=`<div class="row between"><h1 style="margin:0">My Scripts</h1><a class=btn href="#/new">+ Create Script</a></div><input id=q placeholder="Search scripts…" style="margin:16px 0"><div class=card id=sl></div>`;
  const draw=()=>{const q=$('#q').value.toLowerCase(),f=list.filter(s=>(s.name+s.description).toLowerCase().includes(q));$('#sl').innerHTML=f.map(row).join('')||(list.length?'<div class=empty>No results.</div>':empty());bind()};
  $('#q').oninput=draw;draw();
}
function editor(){
  const s=cur||{name:'',description:'',source:'',enabled:true};
  $('#main').innerHTML=`<h1 style="margin:0 0 14px">${cur?'Edit script':'New script'}</h1><div class=card>
  <div class=row><div style="flex:1;min-width:200px"><label>Name</label><input id=nm maxlength=80 value="${esc(s.name)}"></div><div style="flex:2;min-width:240px"><label>Description</label><input id=ds value="${esc(s.description)}"></div></div>
  <label>Lua source</label><div class=ed><div class=gut id=gut></div><div class=code><pre id=pre></pre><textarea id=src spellcheck=false autocapitalize=off>${esc(s.source)}</textarea></div></div>
  <div class="row" style="margin-top:14px"><button class=btn id=sv>💾 Save</button><button class="btn ghost" id=cp>Copy code</button><button class="btn ghost" id=cl>Clear</button>
  <label style="margin:0;display:flex;gap:6px"><input type=checkbox id=au style="width:auto"> Auto-save</label>
  ${cur?`<label style="margin:0 0 0 auto;display:flex;gap:6px"><input type=checkbox id=en style="width:auto" ${s.enabled?'checked':''}> Enabled</label><button class="btn danger" id=dl>Delete</button>`:''}</div></div>
  ${cur?`<div class=card style="margin-top:14px"><h3 style="margin-top:0">Loadstring <span class=muted>· v${cur.version} · ${cur.views} loads</span></h3><code class=ls>${esc(ls(cur.id))}</code><code class=ls>${esc(url(cur.id))}</code>
  <div class=row><button class=btn id=cls>Copy Loadstring</button><button class="btn ghost" id=cu>Copy Script URL</button></div></div><div class=card style="margin-top:14px"><h3 style="margin-top:0">Version history</h3><div id=vh></div></div>`:''}`;
  const t=$('#src'),scr=()=>{$('#pre').scrollTop=t.scrollTop;$('#pre').scrollLeft=t.scrollLeft;$('#gut').scrollTop=t.scrollTop},
  sync=()=>{$('#pre').innerHTML=hl(t.value)+'\n ';$('#gut').textContent=Array.from({length:t.value.split('\n').length},(_,i)=>i+1).join('\n');scr()};
  t.oninput=()=>{sync();if(auto&&cur){clearTimeout(timer);timer=setTimeout(()=>save(true),2000)}};t.onscroll=scr;sync();
  t.onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();document.execCommand('insertText',false,'  ')}};
  $('#au').checked=auto;$('#au').onchange=e=>{auto=e.target.checked;if(auto&&!cur)toast('Auto-save starts after the first save')};
  $('#cp').onclick=()=>copy(t.value);$('#cl').onclick=async()=>{if(await ask('Clear the editor?')){t.value='';sync()}};$('#sv').onclick=()=>save();
  if(cur){$('#cls').onclick=()=>copy(ls(cur.id));$('#cu').onclick=()=>copy(url(cur.id));
    $('#en').onchange=async e=>{const{error}=await sb.from('scripts').update({enabled:e.target.checked}).eq('id',cur.id);error?toast(error.message,1):toast(e.target.checked?'Script enabled':'Script disabled')};
    $('#dl').onclick=async()=>{if(!await ask('Delete this script permanently?'))return;const{error}=await sb.from('scripts').delete().eq('id',cur.id);error?toast(error.message,1):(toast('Deleted'),location.hash='#/scripts')};versions()}
}
async function save(silent){
  const name=$('#nm').value.trim();if(!name)return toast('Name is required',1);
  const row={name,description:$('#ds').value,source:$('#src').value};
  if(cur){const{data,error}=await sb.from('scripts').update(row).eq('id',cur.id).select().single();if(error)return toast(error.message,1);const nv=data.version!==cur.version;cur=data;toast(silent?'Auto-saved':'Saved'+(nv?` · v${data.version}`:''));if(nv)versions()}
  else{const{data,error}=await sb.from('scripts').insert(row).select().single();if(error)return toast(error.message,1);toast('Script created');location.hash='#/edit/'+data.id}
}
async function versions(){
  const{data}=await sb.from('script_versions').select('*').eq('script_id',cur.id).order('version',{ascending:false});
  $('#vh').innerHTML=(data||[]).map(v=>`<div class=item><span>Version ${v.version} <span class=muted>· ${ago(v.created_at)}</span></span><button class="btn ghost sm" data-v="${v.version}">Load into editor</button></div>`).join('');
  document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{const v=data.find(x=>x.version==b.dataset.v);$('#src').value=v.source;$('#src').dispatchEvent(new Event('input'));toast('Loaded v'+v.version+' — press Save to apply')});
}
function settings(){
  $('#main').innerHTML=`<h1 style="margin:0 0 14px">Settings</h1><div class=grid style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
  <div class=card><h3 style="margin-top:0">Account</h3><p class=muted>Email<br><span style="color:var(--tx)">${esc(user.email)}</span></p><p class=muted>Created<br><span style="color:var(--tx)">${ago(user.created_at)}</span></p><p class=muted>Last sign-in<br><span style="color:var(--tx)">${ago(user.last_sign_in_at)}</span></p><button class="btn ghost" id=lo>Log out</button></div>
  <form class=card id=pf><h3 style="margin-top:0">Change password</h3><label>New password</label><input type=password id=p1 minlength=8 required autocomplete=new-password><label>Confirm</label><input type=password id=p2 required autocomplete=new-password><br><br><button class=btn>Update password</button></form>
  <div class=card><h3 style="margin-top:0">Theme</h3><div class=row><button class="btn" data-ac=purple>Purple</button><button class="btn ghost" data-ac=blue>Blue</button></div>
  <h3>Sessions</h3><p class=muted>Sign out from every device, including this one.</p><button class="btn danger" id=lg>Sign out everywhere</button></div></div>`;
  $('#lo').onclick=()=>sb.auth.signOut();
  $('#lg').onclick=async()=>{if(await ask('Sign out of all devices?'))sb.auth.signOut({scope:'global'})};
  document.querySelectorAll('[data-ac]').forEach(b=>b.onclick=()=>{localStorage.setItem('accent',b.dataset.ac);theme();toast('Theme updated')});
  $('#pf').onsubmit=async e=>{e.preventDefault();if($('#p1').value!==$('#p2').value)return toast('Passwords do not match',1);const{error}=await sb.auth.updateUser({password:$('#p1').value});error?toast(error.message,1):(toast('Password updated'),e.target.reset())};
}
boot();
