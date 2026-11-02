import type { Product } from '@/types/product'

// Presentation copy only: catalogue IDs, prices and administrator records stay intact.
const translations: Record<string, string> = {
  'YOU miracle Very Sexy Clothes': 'يو ميراكل فيري سيكسي كلوذز',
  'YOU miracle': 'يو ميراكل', 'LAVERNE': 'لافيرن', 'Cherry Trap': 'تشيري تراب',
  'Boutique': 'بوتيك', 'V.V.LOVE': 'في في لوف', 'VGR': 'في جي آر',
  'Cleansing Face Wash': 'غسول تنظيف الوجه', 'Fluid': 'مرطب خفيف',
  'Peel-off Mask Pack': 'ماسك تقشير', 'Body Scrub': 'مقشر الجسم', 'Smooth': 'ناعم',
  'Fine Fragrance Mist': 'رذاذ عطري', 'Body Butter': 'زبدة الجسم',
  'Shower Gel Aloe': 'جل استحمام بالألوفيرا', 'Vitamin E': 'فيتامين هـ',
  'Daily Nourishing Body Lotion': 'لوشن يومي مغذٍ للجسم',
  'Aloe Vera': 'ألوفيرا', 'Aloe': 'ألوفيرا', 'SADOER': 'سادور', 'CQK': 'سي كيو كي',
  'Kiss Beauty': 'كيس بيوتي', 'Nose Strip': 'شرائط الأنف', 'MUSK POWDER': 'مسك البودرة',
  'MUSK CHERRY': 'مسك الكرز', 'MUSK VANILLA': 'مسك الفانيلا',
  'White Invisible Clear': 'أبيض غير مرئي', 'Black': 'أسود', 'Pearl': 'لؤلؤي', 'Beauty': 'جمال',
  'Magic': 'ماجيك', 'Peach': 'خوخ', 'Banana': 'موز', 'Cherry': 'كرز', 'Blueberry': 'توت أزرق',
  'Emelie': 'إيميلي', 'SevenCool': 'سفن كول',
  'Lash Princess I Love Extreme Volume': 'لاش برينسس آي لوف إكستريم فوليوم',
  'Lash Princess': 'لاش برينسس', 'I Love Extreme Volume': 'آي لوف إكستريم فوليوم',
  'Hydro Shock': 'هايدرو شوك', 'Sence': 'سنس', 'VEGAN': 'نباتي',
  'Pink': 'وردي', 'Light': 'فاتح', 'Fuchsia': 'فوشي', 'Nude': 'لحمي', 'Brown': 'بني',
  'Coral': 'مرجاني', 'Red': 'أحمر', 'Burgundy': 'عنابي', 'Petal': 'بتلات',
  'Aurora': 'أورورا', 'Beautiful': 'جميل', 'Summer': 'صيف', 'Forever': 'للأبد',
  'Emotion': 'إحساس', 'Fairy': 'جنية', 'Party': 'حفلة', 'Royal': 'ملكي',
  'Sweety': 'حلو', 'Dreaming': 'أحلام', 'Moist Lip': 'مويست ليب',
  'Watermelon': 'بطيخ', 'Strawberry': 'فراولة', 'Rice': 'أرز', 'Coffee': 'قهوة',
  'Avocado': 'أفوكادو', 'K Gold': 'قيراط ذهب', 'Pure Sweet': 'بيور سويت',
  'Flawless Filter': 'فلولس فلتر', 'Sheglam': 'شيغلام', 'SPF': 'عامل حماية',
  'Lip Liner Marker': 'أقلام تحديد الشفاه', 'Peel-Off Mask': 'قناع قابل للتقشير',
  'Witch Hazel': 'بندق الساحرة', 'Fragrance Lotion': 'لوشن معطر', 'BB': 'بي بي',
  'mAh': 'مللي أمبير ساعة', 'USB': 'يو إس بي', 'IPX': 'مقاومة الماء آي بي إكس',
  'LED': 'إضاءة ليد', 'ml': 'مل', 'g': 'غ', 'E': 'هـ', 'V': 'في', 'C': 'ج',
}
const phrases = Object.keys(translations).sort((a, b) => b.length - a.length)
const pattern = new RegExp(`(?<![a-z])(?:${phrases.map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![a-z])`, 'gi')
const lookup = new Map(Object.entries(translations).map(([key, value]) => [key.toLowerCase(), value]))

export const arabicStoreText = (text: string) => text
  .replace(pattern, match => lookup.get(match.toLowerCase()) ?? match)
  .replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)))

export function arabicStoreProduct(product: Product): Product {
  return {
    ...product,
    nameAr: arabicStoreText(product.nameAr),
    description: product.description ? arabicStoreText(product.description) : null,
    categoryLabel: arabicStoreText(product.categoryLabel),
    badge: product.badge ? arabicStoreText(product.badge) : null,
    benefits: product.benefits.map(arabicStoreText),
    variants: product.variants.map(variant => ({ ...variant, label: arabicStoreText(variant.label) })),
  }
}
