-- You & Me Cosmetics — Supabase seed
-- GENERATED FILE — do not edit by hand.
-- Regenerate with:  npm run seed:build
-- Source products: products_from_html.json (38 products)
-- Source prices:   you-and-me-prices.json (38 entries)
-- Generated at:    2026-10-05T06:41:14.293Z

set search_path = public, extensions;

-- Wipe catalogue data only (site_settings is preserved).
delete from public.product_variants;
delete from public.products;

-- package-laverne-you-miracle — LAVERNE YOU Miracle Package
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'package-laverne-you-miracle',
  'باكيج YOU miracle من LAVERNE - عناية وجه وجسم متكاملة',
  'LAVERNE YOU Miracle Package',
  'محتويات البكج: غسول الوجه Cleansing Face Wash 150ml + مرطب خفيف Fluid للوجه 100ml + ماسك تقشير للوجه Peel-off Mask Pack 125ml + مقشر الجسم Body Scrub + لوشن الجسم Smooth 260ml - تنظيف ونعومة، ترطيب وإشراق، عناية للوجه والجسم، مكونات مختارة لبشرة ناعمة',
  'packages',
  'باكيجات مميزة',
  12,
  52,
  '/products/package-laverne-you-miracle.webp',
  'باكيج متكامل',
  '["تنظيف ونعومة","ترطيب وإشراق","عناية وجه وجسم","مكونات مختارة"]'::jsonb,
  true,
  true,
  0
);

-- package-cherry-trap-boutique — Cherry Trap Boutique Package
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'package-cherry-trap-boutique',
  'باكيج Cherry Trap من Boutique - تركيبة منعشة وناعمة',
  'Cherry Trap Boutique Package',
  'محتويات: Fine Fragrance Mist 250ml + Body Butter 250ml + Shower Gel Aloe + Vitamin E 400ml + Daily Nourishing Body Lotion 400ml - رائحة منعشة وجذابة، ترطيب عميق، تركيبة غنية بزبدة الشيا وفيتامين E، لبشرة أكثر نعومة ونضارة',
  'packages',
  'باكيجات مميزة',
  10,
  50,
  '/products/package-cherry-trap-boutique.webp',
  'رائحة كرز منعشة',
  '["رائحة منعشة","ترطيب عميق","زبدة الشيا وفيتامين E","نعومة ونضارة"]'::jsonb,
  true,
  true,
  1
);

-- vgr-shaver-trimmer-2in1 — VGR Electric Shaver & Trimmer 2in1 V-361
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'vgr-shaver-trimmer-2in1',
  'ماكينة حلاقة وتحديد 2 في 1 VGR V-361 للرجال والنساء',
  'VGR Electric Shaver & Trimmer 2in1 V-361',
  'ماكينة حلاقة وتحديد احترافية - رأس مزدوج للحلاقة والتحديد، بطارية ليثيوم 500mAh، شحن USB، مقاومة للماء IPX6 يمكن استخدامها على البشرة المبللة، شاشة رقمية LED توضح نسبة البطارية، محتويات: رأس الحلاقة والتحديد، رأس تنعيم، سلك شحن USB، فرشاة تنظيف - خفيفة الوزن، صوت منخفض، تصميم مريح، جودة عالية، الأصلي',
  'packages',
  'أجهزة العناية',
  12,
  25,
  '/products/vgr-shaver-trimmer-2in1.webp',
  'للرجال والنساء',
  '["رأس مزدوج","بطارية 500mAh","IPX6 مقاومة للماء","شاشة LED"]'::jsonb,
  true,
  true,
  2
);

-- package-naqaa — Al Naqaa Package - Aloe Vera Routine
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'package-naqaa',
  'باكيج النقاء - روتين الألوفيرا المتكامل',
  'Al Naqaa Package - Aloe Vera Routine',
  'محتويات البكج: غسول Aloe Vera من Boutique + ماسك عيون Aloe من SADOER + ماسك يدين Aloe من CQK + مرطب شفاه Kiss Beauty + Nose Strip من CQK - عناية نقية وطبيعية',
  'packages',
  'باكيجات مميزة',
  10,
  30,
  '/products/package-naqaa.webp',
  'باكيج الأكثر مبيعاً',
  '["روتين متكامل","ألوفيرا طبيعية","توفير 27%","حقيبة شفافة هدية"]'::jsonb,
  true,
  true,
  3
);

-- package-dalal — Al Dalal Package - Pampering
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'package-dalal',
  'باكيج الدلال - دلال وأناقة',
  'Al Dalal Package - Pampering',
  'شاور جل من Boutique + لوشن للجسم من Boutique + سكراب للجسم من CQK + مست للجسم من V.V.LOVE + مزيل عرق رول من نيفيا + هدية من متجرنا',
  'packages',
  'باكيجات مميزة',
  16,
  48,
  '/products/package-dalal.webp',
  'هدية مجانية',
  '["دلال كامل","5 منتجات + هدية","توفير كبير","علبة فاخرة"]'::jsonb,
  true,
  true,
  4
);

-- package-muzhla — Mozhla Package - Full Glam Look
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'package-muzhla',
  'باكيج مذهلة - إطلالة متكاملة لأنك مذهلة دائماً',
  'Mozhla Package - Full Glam Look',
  'محتويات: باليت كونتور + باليت بلاشر + برايمر + فاونديشن + 2 قلم روج + قلم تحديد شفاه + 2 مرطب شفاه + قلم حواجب + ماسكارا + ماسكارا جل مغذية + هدية من متجرنا',
  'packages',
  'باكيجات مميزة',
  28,
  58,
  '/products/package-muzhla.webp',
  'إطلالة مذهلة',
  '["مكياج كامل","11 قطعة + هدية","مناسبات وهدايا","بوكس ملكي"]'::jsonb,
  true,
  true,
  5
);

-- package-nasma — Nasma Package - Fresh Breeze
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'package-nasma',
  'باكيج نسمة - لأنك تستحقين كل ما هو أجمل',
  'Nasma Package - Fresh Breeze',
  'مسك الطهارة + مخمرية للشعر والجسم + مزيل عرق نيفيا + بودي مست + مرطب شفاه - انتعاش يدوم',
  'packages',
  'باكيجات مميزة',
  10,
  38,
  '/products/package-nasma.webp',
  'باكيج نسمة',
  '["مسك طهارة","مخمرية فاخرة","انتعاش طويل","تغليف هدايا"]'::jsonb,
  true,
  true,
  6
);

-- musk-ard-alharamain — Ard Al Haramain Musk - Body Mist
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'musk-ard-alharamain',
  'مسك أرض الحرمين - معطر للجسم 8 روائح فاخرة',
  'Ard Al Haramain Musk - Body Mist',
  'رائحة نقاء تدوم معك طوال اليوم - معطر للجسم، يدوم طويلاً، لطيف على البشرة، روائح فاخرة ومميزة',
  'mist',
  'عطور ومسك',
  1.25,
  17,
  '/products/musk-ard-alharamain.webp',
  '8 روائح فاخرة',
  '["يدوم طويلاً","لطيف على البشرة","روائح فاخرة","معطر للجسم"]'::jsonb,
  true,
  true,
  7
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'musk-ard-alharamain');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('مسك الطهارة'::text, 1.25::numeric, 0), ('مسك البودرة'::text, 1.25::numeric, 1), ('مسك الماس'::text, 1.25::numeric, 2), ('مسك الذهب'::text, 1.25::numeric, 3), ('مسك روح'::text, 1.25::numeric, 4), ('مسك غرام'::text, 1.25::numeric, 5), ('مسك التوت'::text, 1.25::numeric, 6), ('مسك الفانيلا'::text, 1.25::numeric, 7)) as v(label, price, sort_order)
where p.slug = 'musk-ard-alharamain';

-- musk-tahara-oil — Musk Al Tahara Concentrated Oil 20ml
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'musk-tahara-oil',
  'مسك الطهارة - زيوت عطرية مركزة 20مل',
  'Musk Al Tahara Concentrated Oil 20ml',
  'زيوت عطرية مركزة - تركيبة مركزة تدوم طويلاً، رائحة نقية ومنعشة، مناسب للاستخدام اليومي، حجم عملي 20 مل',
  'mist',
  'عطور ومسك',
  2,
  12,
  '/products/musk-tahara-oil.webp',
  'تركيبة مركزة',
  '["تركيبة مركزة","يدوم طويلاً","رائحة نقية","20 مل عملي"]'::jsonb,
  true,
  true,
  8
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'musk-tahara-oil');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('مسك البودرة MUSK POWDER'::text, 2::numeric, 0), ('مسك الكرز MUSK CHERRY'::text, 2::numeric, 1), ('مسك فانيلا MUSK VANILLA'::text, 2::numeric, 2)) as v(label, price, sort_order)
where p.slug = 'musk-tahara-oil';

-- nivea-deo-72h — Nivea Deodorant 72h Active Protection
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'nivea-deo-72h',
  'مزيل عرق نيفيا - حماية 72 ساعة انتعاش يدوم',
  'Nivea Deodorant 72h Active Protection',
  'انتعاش يدوم 72 ساعة - حماية تدوم 72 ساعة، يقلل من البقع على الملابس، رائحة منعشة تدوم طويلاً، لطيف على البشرة',
  'skincare',
  'العناية بالجسم',
  2.5,
  7.5,
  '/products/nivea-deo-72h.webp',
  '72 ساعة حماية',
  '["72 ساعة حماية","يقلل البقع","رائحة منعشة","لطيف على البشرة"]'::jsonb,
  true,
  true,
  9
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'nivea-deo-72h');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('Black & White Invisible Clear رول'::text, 2.5::numeric, 0), ('Pearl & Beauty رول'::text, 2.5::numeric, 1), ('Black & White Invisible Clear ستيك'::text, 3.5::numeric, 2)) as v(label, price, sort_order)
where p.slug = 'nivea-deo-72h';

-- mascara — Vitamin E Gel Mascara
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'mascara',
  'ماسكارا مغذية بفيتامين E',
  'Vitamin E Gel Mascara',
  'تغذية وتكثيف فوري مع فيتامين E والبانثينول',
  'makeup',
  'مكياج',
  2,
  12,
  '/products/mascara.webp',
  'الأكثر مبيعاً',
  '["مقاومة للماء","تغذية الرموش","لمسة حريرية"]'::jsonb,
  true,
  true,
  10
);

-- aloe-foam — Aloe Vera Cleansing Foam
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'aloe-foam',
  'غسول الألوفيرا الرغوي',
  'Aloe Vera Cleansing Foam',
  'رغوة خفيفة تنقي المسام وتوازن البشرة',
  'skincare',
  'العناية بالبشرة',
  2.5,
  9,
  '/products/aloe-foam.webp',
  NULL,
  '["ألوفيرا 99%","بشرة نقية","ترطيب"]'::jsonb,
  true,
  false,
  11
);

-- lip-oil — Magic Lip Oil
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'lip-oil',
  'زيت الشفاه السحري Magic',
  'Magic Lip Oil',
  'لمعان زجاجي مع ترطيب يدوم 12 ساعة',
  'lips',
  'شفاه وعيون',
  1.25,
  NULL,
  '/products/lip-oil.webp',
  '4 نكهات',
  '["ترطيب عميق","لمعان","نكهات طبيعية"]'::jsonb,
  true,
  true,
  12
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'lip-oil');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('خوخ Peach'::text, 1.25::numeric, 0), ('موز Banana'::text, 1.25::numeric, 1), ('كرز Cherry'::text, 1.25::numeric, 2), ('توت Blueberry'::text, 1.25::numeric, 3)) as v(label, price, sort_order)
where p.slug = 'lip-oil';

-- foundation — Liquid Foundation SPF25
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'foundation',
  'كريم أساس سائل Emelie',
  'Liquid Foundation SPF25',
  'تغطية حريرية مع حماية SPF25',
  'makeup',
  'مكياج',
  3,
  18,
  '/products/foundation.webp',
  'تغطية كاملة',
  '["SPF25","يدوم 16 ساعة","لمسة طبيعية"]'::jsonb,
  true,
  true,
  13
);

-- aloe-gel — Soothing Aloe Gel 99%
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'aloe-gel',
  'جل الألوفيرا المهدئ 99%',
  'Soothing Aloe Gel 99%',
  'جل متعدد الاستخدامات يهدئ ويرطب',
  'skincare',
  'العناية بالبشرة',
  1.5,
  NULL,
  '/products/aloe-gel.webp',
  NULL,
  '["تهدئة فورية","99% طبيعي","للوجه والجسم"]'::jsonb,
  true,
  false,
  14
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'aloe-gel');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('120ml'::text, 1::numeric, 0), ('270ml'::text, 1.5::numeric, 1)) as v(label, price, sort_order)
where p.slug = 'aloe-gel';

-- nose-strips — Nose Pore Strips
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'nose-strips',
  'شرائط تنظيف الأنف CQK',
  'Nose Pore Strips',
  'تزيل الرؤوس السوداء بلطف',
  'skincare',
  'العناية بالبشرة',
  2,
  5,
  '/products/nose-strips.webp',
  NULL,
  '["فحم طبيعي","تنقية المسام","نتيجة فورية"]'::jsonb,
  true,
  false,
  15
);

-- primer — Collagen Primer
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'primer',
  'برايمر بالكولاجين',
  'Collagen Primer',
  'قاعدة مثالية تملأ المسام وتثبت المكياج',
  'makeup',
  'مكياج',
  3,
  15,
  '/products/primer.webp',
  'جديد',
  '["كولاجين","تثبيت","مسام مخفية"]'::jsonb,
  true,
  true,
  16
);

-- eye-mask — Starry Eye Mask - 60 قطعة
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'eye-mask',
  'ماسك العيون النجمي',
  'Starry Eye Mask - 60 قطعة',
  'يقلل الانتفاخ والهالات بلمسة باردة',
  'lips',
  'شفاه وعيون',
  2.5,
  NULL,
  '/products/eye-mask.webp',
  '60 قطعة',
  '["كولاجين","يقلل الهالات","انتعاش"]'::jsonb,
  true,
  true,
  17
);

-- rose-water — Rose Water 250ml
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'rose-water',
  'ماء الورد الأصلي',
  'Rose Water 250ml',
  'تونر طبيعي ينعش ويوازن البشرة',
  'skincare',
  'العناية بالبشرة',
  2,
  7.5,
  '/products/rose-water.webp',
  NULL,
  '["ورد طبيعي","تثبيت مكياج","انتعاش"]'::jsonb,
  true,
  false,
  18
);

-- eyebrow-pencil — Eyebrow Pencil Four-Point
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'eyebrow-pencil',
  'قلم حواجب 4 نقاط بمظهر طبيعي Kiss Beauty',
  'Eyebrow Pencil Four-Point',
  'حواجب طبيعية ومتناسقة، ثبات طويل، مقاوم للماء والتعرق',
  'makeup',
  'مكياج',
  1,
  6,
  '/products/eyebrow-pencil.webp',
  'مقاوم للماء',
  '["مظهر طبيعي","ثبات طويل","مقاوم للماء"]'::jsonb,
  true,
  true,
  19
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'eyebrow-pencil');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('بني غامق'::text, 1::numeric, 0), ('بني فاتح'::text, 1::numeric, 1)) as v(label, price, sort_order)
where p.slug = 'eyebrow-pencil';

-- blush-palette — Blush Palette
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'blush-palette',
  'بلاشر باليت 6 ألوان ناعمة',
  'Blush Palette',
  'ألوان ناعمة ولمسة طبيعية - SevenCool',
  'makeup',
  'مكياج',
  4,
  13,
  '/products/blush-palette.webp',
  'ألوان ناعمة',
  '["6 ألوان","لمسة طبيعية","ثبات"]'::jsonb,
  true,
  true,
  20
);

-- contour-palette — Contour Palette
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'contour-palette',
  'كونتور باليت 8 ألوان',
  'Contour Palette',
  'تحديد وإضاءة باحترافية',
  'makeup',
  'مكياج',
  4,
  14,
  '/products/contour-palette.webp',
  NULL,
  '["8 ألوان","تحديد احترافي","إضاءة"]'::jsonb,
  true,
  false,
  21
);

-- essence-mascara — Essence Mascara Duo
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'essence-mascara',
  'ماسكارا ايسنس - لاش برينسس و اكستريم',
  'Essence Mascara Duo',
  'مظهر رموش أطول وكثافة أكبر، تركيبة خفيفة، ثبات طوال اليوم',
  'makeup',
  'مكياج',
  3,
  8.5,
  '/products/essence-mascara.webp',
  'الأكثر طلباً',
  '["كثافة أكبر","خفيفة","ثبات طويل"]'::jsonb,
  true,
  true,
  22
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'essence-mascara');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('Lash Princess'::text, 3::numeric, 0), ('I Love Extreme Volume'::text, 3::numeric, 1)) as v(label, price, sort_order)
where p.slug = 'essence-mascara';

-- sence-lip-balm — Sence Lip Balm Hydro Shock
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'sence-lip-balm',
  'مرطب شفاه Hydro Shock بحمض الهيالورونيك - Sence',
  'Sence Lip Balm Hydro Shock',
  'يرطب بعمق، تنعيم الشفاه، حمض الهيالورونيك، تركيبة نباتية VEGAN',
  'lips',
  'شفاه وعيون',
  1.5,
  5,
  '/products/sence-lip-balm.webp',
  NULL,
  '["ترطيب عميق","حمض الهيالورونيك","Vegan"]'::jsonb,
  true,
  false,
  23
);

-- lipstick-set — Lipstick 6 Shades
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'lipstick-set',
  'روج شفاه 6 ألوان غنية',
  'Lipstick 6 Shades',
  'تركيبة مريحة، لون غني، يدوم طويلاً',
  'lips',
  'شفاه وعيون',
  0.75,
  7,
  '/products/lipstick-set.webp',
  '6 ألوان',
  '["لون غني","يدوم طويلاً","تركيبة مريحة"]'::jsonb,
  true,
  true,
  24
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'lipstick-set');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('Pink Light'::text, 0.75::numeric, 0), ('Fuchsia'::text, 0.75::numeric, 1), ('Nude Brown'::text, 0.75::numeric, 2), ('Coral'::text, 0.75::numeric, 3), ('Red'::text, 0.75::numeric, 4), ('Burgundy'::text, 0.75::numeric, 5)) as v(label, price, sort_order)
where p.slug = 'lipstick-set';

-- body-mist — V.V.LOVE Body Mist 250ml
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'body-mist',
  'بودي ميست V.V.LOVE - نفحات منعشة',
  'V.V.LOVE Body Mist 250ml',
  'نفحات منعشة لكل لحظة من يومك، تصميم أنيق، مناسب للاستخدام اليومي',
  'mist',
  'عطور وميست',
  2.25,
  12,
  '/products/body-mist.webp',
  '6 روائح',
  '["رائحة منعشة","250ml","تصميم أنيق"]'::jsonb,
  true,
  true,
  25
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'body-mist');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('Petal Aurora'::text, 2.25::numeric, 0), ('Beautiful Summer'::text, 2.25::numeric, 1), ('Forever Emotion'::text, 2.25::numeric, 2), ('Fairy Party'::text, 2.25::numeric, 3), ('Royal Sweety'::text, 2.25::numeric, 4), ('Dreaming Party'::text, 2.25::numeric, 5)) as v(label, price, sort_order)
where p.slug = 'body-mist';

-- moist-lip — Moist Lip Repair Balm
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'moist-lip',
  'مرطب شفاه Moist Lip بالفواكه',
  'Moist Lip Repair Balm',
  'ترطيب ونعومة للشفاه بلمسة فواكه لذيذة',
  'lips',
  'شفاه وعيون',
  1.25,
  NULL,
  '/products/moist-lip.webp',
  '4 نكهات',
  '["ترطيب","نكهات طبيعية","ميدالية تعليق"]'::jsonb,
  true,
  true,
  26
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'moist-lip');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('Watermelon بطيخ'::text, 1.25::numeric, 0), ('Strawberry فراولة'::text, 1.25::numeric, 1), ('Peach خوخ'::text, 1.25::numeric, 2), ('Cherry كرز'::text, 1.25::numeric, 3)) as v(label, price, sort_order)
where p.slug = 'moist-lip';

-- body-scrub-cqk — CQK Body Scrub 500g
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'body-scrub-cqk',
  'مقشر الجسم الطبيعي CQK - 5 روائح فاخرة',
  'CQK Body Scrub 500g',
  'مقشر غني بالمكونات الطبيعية يزيل الخلايا الميتة ويمنحك بشرة ناعمة ومشرقة',
  'skincare',
  'العناية بالبشرة',
  2.5,
  16,
  '/products/body-scrub-cqk.webp',
  '500g',
  '["تقشير لطيف","500g","5 روائح فاخرة"]'::jsonb,
  true,
  true,
  27
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'body-scrub-cqk');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('Rice'::text, 2.5::numeric, 0), ('Coffee'::text, 2.5::numeric, 1), ('Avocado'::text, 2.5::numeric, 2), ('Peach'::text, 2.5::numeric, 3), ('24K Gold'::text, 2.5::numeric, 4)) as v(label, price, sort_order)
where p.slug = 'body-scrub-cqk';

-- khamria-pure-sweet — Pure Sweet Khamria
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'khamria-pure-sweet',
  'مخمرية Pure Sweet للشعر والجسم - 5 روائح',
  'Pure Sweet Khamria',
  'مخمرية فاخرة للشعر والجسم بتركيبة ثابتة وروائح تأسر الحواس',
  'mist',
  'عطور وميست',
  1,
  13,
  '/products/khamria-pure-sweet.webp',
  'الأكثر مبيعاً',
  '["ثبات طويل","للشعر والجسم","روائح فاخرة"]'::jsonb,
  true,
  true,
  28
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'khamria-pure-sweet');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('صبايا'::text, 1::numeric, 0), ('مانجا'::text, 1::numeric, 1), ('ورد'::text, 1::numeric, 2), ('أنا الأبيض'::text, 1::numeric, 3), ('موصوف'::text, 1::numeric, 4)) as v(label, price, sort_order)
where p.slug = 'khamria-pure-sweet';

-- boutique-baby-powder — Boutique Baby Powder Set
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'boutique-baby-powder',
  'مجموعة بودرة الأطفال الوردية - لوشن وجل استحمام',
  'Boutique Baby Powder Set',
  'مجموعة متكاملة برائحة بودرة الأطفال الوردية الناعمة - لوشن وجل استحمام',
  'skincare',
  'العناية بالبشرة',
  7,
  20,
  '/products/boutique-baby-powder.webp',
  'مجموعة متكاملة',
  '["مجموعة كاملة","رائحة بودرة الأطفال","ترطيب فاخر"]'::jsonb,
  true,
  true,
  29
);

-- hand-mask-aloe — Aloe & Niacinamide Hand Mask
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'hand-mask-aloe',
  'قناع اليدين بالألوفيرا والنياسيناميد',
  'Aloe & Niacinamide Hand Mask',
  'قناع مكثف يغذي ويرطب اليدين في 20 دقيقة فقط',
  'skincare',
  'العناية بالبشرة',
  1,
  6,
  '/products/hand-mask-aloe.webp',
  '20 دقيقة',
  '["ألوفيرا","نياسيناميد","ترطيب عميق"]'::jsonb,
  true,
  true,
  30
);

-- hyaluronic-cream — Hyaluronic Acid Renewing Cream
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'hyaluronic-cream',
  'كريم حمض الهيالورونيك المجدد',
  'Hyaluronic Acid Renewing Cream',
  'كريم مجدد بتركيز عالٍ من حمض الهيالورونيك لنضارة وشباب البشرة',
  'skincare',
  'العناية بالبشرة',
  3.5,
  19,
  '/products/hyaluronic-cream.webp',
  'هيالورونيك',
  '["هيالورونيك","تجديد البشرة","نضارة فورية"]'::jsonb,
  true,
  true,
  31
);

-- flawless-filter-primer — Flawless Filter Primer
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'flawless-filter-primer',
  'برايمر فلتر Flawless Filter لإطلالة مثالية',
  'Flawless Filter Primer',
  'برايمر فلتر يمنحك إشراقة فورية وإطلالة مثالية كالفلتر',
  'makeup',
  'مكياج',
  3,
  18,
  '/products/flawless-filter-primer.webp',
  'إشراقة فورية',
  '["إشراقة فورية","تغطية ناعمة","لمسة مثالية"]'::jsonb,
  true,
  true,
  32
);

-- sheglam-spf90 — Sheglam Sunscreen SPF 90+
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'sheglam-spf90',
  'واقي شمس Sheglam SPF 90+ لتفتيح وتوحيد اللون',
  'Sheglam Sunscreen SPF 90+',
  'حماية قصوى SPF 90+ مع تفتيح وتوحيد لون البشرة',
  'skincare',
  'العناية بالبشرة',
  7,
  15,
  '/products/sheglam-spf90.webp',
  'SPF 90+',
  '["SPF 90+","تفتيح","توحيد اللون"]'::jsonb,
  true,
  true,
  33
);

-- lip-liner-marker-rm — Romantic Matte Lip Liner Marker 6 Shades
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'lip-liner-marker-rm',
  'أقلام تحديد الشفاه Lip Liner Marker - ثبات طويل الأمد',
  'Romantic Matte Lip Liner Marker 6 Shades',
  'تحديد دقيق وسهل الاستخدام، ثبات طويل الأمد، 6 درجات ألوان غنية من النود إلى الأحمر والبرغندي، مع سواتش للشفاه',
  'lips',
  'شفاه وعيون',
  1,
  8.5,
  '/products/lip-liner-marker-rm.webp',
  '6 ألوان',
  '["تحديد دقيق","ثبات طويل","6 ألوان غنية"]'::jsonb,
  true,
  true,
  34
);
delete from public.product_variants where product_id = (select id from public.products where slug = 'lip-liner-marker-rm');
insert into public.product_variants (product_id, label, price, is_active, sort_order)
select p.id, v.label, v.price, true, v.sort_order
from public.products p
cross join (values ('01 وردي فاتح'::text, 1::numeric, 0), ('02 بني محمر'::text, 1::numeric, 1), ('03 بني كراميل'::text, 1::numeric, 2), ('04 بني غامق'::text, 1::numeric, 3), ('05 أحمر'::text, 1::numeric, 4), ('06 برغندي'::text, 1::numeric, 5)) as v(label, price, sort_order)
where p.slug = 'lip-liner-marker-rm';

-- cqk-bamboo-charcoal-mask — CQK Pure Skin Bamboo Charcoal Peel-Off Mask 120ml
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'cqk-bamboo-charcoal-mask',
  'قناع الفحم الخيزران الأسود Peel-Off Mask من CQK',
  'CQK Pure Skin Bamboo Charcoal Peel-Off Mask 120ml',
  'ينظف المسام بعمق، يساعد على إزالة الشوائب، يمنح البشرة مظهراً أنقى، يترك البشرة ناعمة ومنتعشة - بخلاصة فحم الخيزران و Witch Hazel لتنظيف المسام العميق، الفحم الخيزراني للتقشير الفعال',
  'skincare',
  'العناية بالبشرة',
  2.5,
  10,
  '/products/cqk-bamboo-charcoal-mask.webp',
  'فحم الخيزران',
  '["ينظف المسام بعمق","إزالة الشوائب","مظهر أنقى","ناعمة ومنتعشة"]'::jsonb,
  true,
  true,
  35
);

-- you-miracle-sexy-clothes-duo — YOU Miracle Mist & Lotion Duo 250ml Each
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'you-miracle-sexy-clothes-duo',
  'رذاذ معطر + لوشن للجسم YOU miracle Very Sexy Clothes',
  'YOU Miracle Mist & Lotion Duo 250ml Each',
  'عطري ورطبي بخطوة واحدة - رائحة تدوم طويلاً، ترطيب ناعم للبشرة، يمنحك إحساس بالانتعاش - رذاذ معطر Fine Fragrance Mist + لوشن عطري Fragrance Lotion',
  'mist',
  'عطور ومسك',
  7,
  22,
  '/products/you-miracle-sexy-clothes-duo.webp',
  '250ml لكل عبوة',
  '["رائحة تدوم طويلاً","ترطيب ناعم","إحساس بالانتعاش","عطري ورطبي"]'::jsonb,
  true,
  true,
  36
);

-- bb-7in1-foundation — BB 7 in 1 Cream Flawless Foundation Romantic Bright
insert into public.products (
  slug, name_ar, name_en, description, category, category_label,
  price, old_price, image_url, badge, benefits, is_active, is_featured, sort_order
) values (
  'bb-7in1-foundation',
  'كريم أساس BB 7 في 1 - تغطية مثالية ولمسة طبيعية',
  'BB 7 in 1 Cream Flawless Foundation Romantic Bright',
  'تغطية مثالية ولمسة طبيعية، تركيبة ناعمة ومريحة، يخفي العيوب ويوحد لون البشرة، قوام ناعم وخفيف على البشرة، يرطب البشرة ويمنحها مظهر طبيعي، مناسب لجميع أنواع البشرة، يحمي من أشعة الشمس الضارة، إطلالة طبيعية ومشرقة - بالمعادن والفيتامينات',
  'makeup',
  'مكياج',
  2,
  14,
  '/products/bb-7in1-foundation.webp',
  'C+ معادن وفيتامينات',
  '["تغطية مثالية","تركيبة ناعمة","يخفي العيوب","يوحد لون البشرة"]'::jsonb,
  true,
  true,
  37
);

-- ---------------------------------------------------------------- settings
insert into public.site_settings (key, value) values
  ('whatsapp_number', '962777260622'),
  ('whatsapp_message', 'مرحباً You and Me Cosmetics 💘\nأرغب بطلب المنتجات التالية:'),
  ('email', 'youme.work20@gmail.com'),
  ('instagram_url', ''),
  ('facebook_url', ''),
  ('currency', 'JOD'),
  ('store_tagline', 'لأن جمالك قصة، ونحن نهتم بتفاصيلها.'),
  ('store_announcement', 'توصيل سريع في الأردن • دفع عند الاستلام'),
  ('store_free_shipping_threshold', '25')
on conflict (key) do update set value = excluded.value, updated_at = now();
