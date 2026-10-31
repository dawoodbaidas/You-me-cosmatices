const fs=require('fs');const edit=(p,f)=>fs.writeFileSync(p,f(fs.readFileSync(p,'utf8')));
edit('src/components/BestSellers.tsx',s=>s.replace(/const raw=progress.*?next=Math.max\(0,Math.min\(items.length-1,Math.round\(position\)\)\)/,'const position=progress*(items.length-1),next=Math.max(0,Math.min(items.length-1,Math.round(position)))'));
edit('src/components/Header.tsx',s=>s.replace('onSelect }:','onSelect, onSearch }:').replace(' settings: SiteSettings;',' onSearch:()=>void; settings: SiteSettings;').replace(/const search=\(\)=>\{[^\n]+/,'const search=()=>{setOpen(false);setMega(false);onSearch()}'));
edit('src/components/Storefront.tsx',s=>s.replace("import BestSellers","import SearchOverlay from './SearchOverlay'\nimport BestSellers").replace("  const [filter,", "  const [searchOpen, setSearchOpen] = useState(false)\n  const [filter,").replace('      <Header\n','      <Header\n        onSearch={() => setSearchOpen(true)}\n').replace('      <CartDrawer\n','      {searchOpen && <SearchOverlay products={products} currency={settings.currency} onClose={() => setSearchOpen(false)} onSelect={id => { setSearchOpen(false); setQuickViewId(id) }} />}\n      <CartDrawer\n'));
edit('src/components/ProductQuickView.tsx',s=>s.replace('  const [quantity,','  const [expanded, setExpanded] = useState(false)\n  const [quantity,').replace('<p className="quickview-description">{product.description}</p>','<div className="quickview-description"><p className={expanded ? "" : "is-collapsed"}>{product.description}</p><button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "عرض أقل" : "قراءة المزيد"}</button></div>').replace('          <div className="quantity-stepper">','        </div>\n        <div className="quickview-purchase">\n          <div className="quantity-stepper">'));
edit('src/components/storefront.css',s=>{
s=s.replace(/\.quickview-sheet \{[\s\S]*?\n\}/, `.quickview-dialog[open] { display:grid; place-items:center; padding:12px; height:100dvh; }
.quickview-sheet { position:relative; display:grid; grid-template-rows:auto minmax(0,1fr) auto; width:min(520px,100%); max-height:calc(100dvh - 24px); border-radius:16px; background:var(--paper); color:var(--ink); overflow:hidden; box-shadow:0 20px 70px #0003; }
.quickview-purchase { padding:12px 18px calc(12px + env(safe-area-inset-bottom)); background:var(--paper); border-top:1px solid var(--line); }
.quickview-purchase .quickview-actions { margin-top:10px; }
.quickview-description .is-collapsed { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
.quickview-description button { text-decoration:underline; min-height:32px; }
`);
s=s.replace(/\.quickview-media \{[\s\S]*?\n\}/,'.quickview-media { position:relative; height:clamp(150px,26dvh,240px); background:var(--paper-deep); }');
s=s.replace('.quickview-info { padding: 19px 20px calc(24px + env(safe-area-inset-bottom)); }','.quickview-info { min-height:0; overflow-y:auto; overscroll-behavior:contain; padding:16px 20px; }');
s=s.replace('font-size: 25px; font-weight: 500; line-height: 1.25;', 'font-size: 20px; font-weight: 500; line-height: 1.5;');
s=s.replace('  .quickview-media { height: 42dvh; }','');
s=s.replace(/  \.quickview-sheet \{[\s\S]*?\n  \}/,`  .quickview-sheet { width:min(880px,100%); height:min(640px,86dvh); max-height:86dvh; grid-template-columns:minmax(0,.9fr) minmax(0,1fr); grid-template-rows:minmax(0,1fr) auto; }
  .quickview-media { grid-column:1; grid-row:1 / 3; }
  .quickview-info { grid-column:2; grid-row:1; }
  .quickview-purchase { grid-column:2; grid-row:2; }`);
s=s.replace('.quickview-info h3 { font-size: 31px; }','.quickview-info h3 { font-size: 24px; }');
return s});
