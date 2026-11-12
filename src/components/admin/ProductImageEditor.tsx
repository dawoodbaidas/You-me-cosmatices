'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { MAX_UPLOAD_BYTES } from '@/lib/products/editor'
import styles from './ProductImageEditor.module.css'

export type ProductImageChoice = { file: File | null; processed: Blob | null; confirmed: boolean; restore: boolean }
type Props = { productId: string; updatedAt?: string; imageUrl?: string | null; originalImageUrl?: string | null; onChange: (choice: ProductImageChoice) => void; onApprove: (choice: ProductImageChoice) => Promise<boolean> }

export default function ProductImageEditor({ productId, updatedAt, imageUrl, originalImageUrl, onChange, onApprove }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null)
  const [working, setWorking] = useState(false)
  const [saving, setSaving] = useState(false)
  const approving = useRef(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [selection, setSelection] = useState<'original' | 'processed' | null>(null)
  const [error, setError] = useState('')
  const original = sourceUrl ?? originalImageUrl ?? imageUrl

  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => { if (sourceUrl) return () => URL.revokeObjectURL(sourceUrl) }, [sourceUrl])
  useEffect(() => { if (result) return () => URL.revokeObjectURL(result.url) }, [result])

  function chooseFile(selected: File) {
    if (!selected.size || selected.size > MAX_UPLOAD_BYTES) { setError('اختاري صورة بحجم حتى 4 MB.'); return }
    if (!/\.(jpe?g|png|webp|gif|avif|tiff?)$/i.test(selected.name)) { setError('اختاري صورة JPG أو PNG أو WebP أو GIF أو AVIF أو TIFF.'); return }
    request.current?.abort(); request.current = null; setWorking(false); setFile(selected); setSourceUrl(URL.createObjectURL(selected))
    setResult(null); setPreviewReady(false); setSelection(null); setError('')
    onChange({ file: selected, processed: null, confirmed: true, restore: false })
  }

  async function process() {
    if (working || request.current || !original) return
    const controller = new AbortController(); request.current = controller
    setWorking(true); setError(''); setResult(null); setPreviewReady(false); setSelection(null)
    onChange({ file, processed: null, confirmed: true, restore: false })
    try {
      const body = new FormData(); body.set('productId', productId); body.set('updatedAt', updatedAt ?? '')
      if (file) body.set('image', file)
      const response = await fetch('/api/admin/products/remove-background', { method: 'POST', body, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]) })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message ?? 'تعذرت إزالة الخلفية. أعيدي المحاولة أو استخدمي الصورة الأصلية.')
      }
      if (!response.headers.get('content-type')?.startsWith('image/webp')) throw new Error('لم تصل صورة معالجة صالحة.')
      const blob = await response.blob()
      if (!blob.size || blob.size > MAX_UPLOAD_BYTES) throw new Error('حجم الصورة المعالجة غير صالح.')
      if (!controller.signal.aborted) setResult({ blob, url: URL.createObjectURL(blob) })
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.name !== 'TimeoutError' ? cause.message : 'انتهت مهلة إزالة الخلفية. أعيدي المحاولة أو استخدمي الصورة الأصلية.')
    } finally { if (request.current === controller) request.current = null; if (!controller.signal.aborted) setWorking(false) }
  }

  function useOriginal() {
    request.current?.abort(); request.current = null; setWorking(false); setSelection('original'); setError('')
    onChange({ file, processed: null, confirmed: true, restore: !file && !!originalImageUrl })
  }

  async function approve() {
    if (!result || !previewReady || approving.current) return
    approving.current = true
    setSaving(true); setError('')
    const choice = { file, processed: result.blob, confirmed: true, restore: false }
    try {
      // Save this exact result only for this approval attempt. Keep the ordinary
      // save choice unchanged if validation, transport or concurrency checks fail.
      if (await onApprove(choice)) setSelection('processed')
      else setError('لم تُحفظ النتيجة. راجعي بيانات المنتج ورسالة الحفظ ثم أعيدي المحاولة.')
    } catch { setError('تعذّر حفظ النتيجة. حدّثي القائمة للتحقق قبل إعادة المحاولة.') }
    finally { approving.current = false; setSaving(false) }
  }

  return <section className={styles.editor} dir="rtl" aria-label="صورة المنتج">
    <header className={styles.header}><div><span className={styles.eyebrow}>صورة المنتج</span><h3>صورة أنيقة، بخطوة واحدة</h3><p>اختاري الصورة، أزيلي الخلفية، ثم راجعي النتيجة قبل الحفظ.</p></div><span className={styles.badge}>remove.bg</span></header>
    <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label="ملف صورة المنتج" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff" onChange={event => { const selected = event.target.files?.[0]; if (selected) chooseFile(selected); event.target.value = '' }} />
    <button type="button" className={styles.upload} onClick={() => input.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (event.dataTransfer.files.length !== 1) { setError('اختاري صورة واحدة في كل مرة.'); return } chooseFile(event.dataTransfer.files[0]) }}>
      <span className={styles.uploadIcon} aria-hidden="true">↑</span><span><strong>{file?.name ?? (original ? 'اختيار صورة جديدة' : 'اختيار صورة المنتج')}</strong><small>اضغطي للاختيار أو اسحبي الصورة هنا · حتى 4 MB</small></span>
    </button>
    {original && <>
      <div className={styles.previews}>
        <figure><figcaption>الصورة الأصلية</figcaption><div className={styles.preview}><Image src={original} alt="الصورة الأصلية" fill unoptimized sizes="(min-width: 768px) 40vw, 90vw" className="object-contain" /></div></figure>
        {result && <figure><figcaption>بعد إزالة الخلفية <span>معاينة منخفضة الدقة</span></figcaption><div className={styles.preview}><Image key={result.url} src={result.url} alt="الصورة بعد إزالة الخلفية" fill unoptimized sizes="(min-width: 768px) 40vw, 90vw" className="object-contain" onLoad={() => setPreviewReady(true)} onError={() => { setPreviewReady(false); setError('تعذر عرض النتيجة. استخدمي الصورة الأصلية أو أعيدي المحاولة.') }} /></div></figure>}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} disabled={working} onClick={() => void process()}>{working ? <><span className={styles.spinner} aria-hidden="true" /> جاري إزالة الخلفية...</> : 'إزالة الخلفية'}</button>
        {result && <button type="button" className={styles.primary} disabled={working || saving || !previewReady || selection === 'processed'} onClick={() => void approve()}>{saving ? 'جارٍ حفظ النتيجة…' : selection === 'processed' ? 'تم حفظ النتيجة' : 'اعتماد النتيجة'}</button>}
        <button type="button" className={styles.secondary} aria-pressed={selection === 'original'} onClick={useOriginal}>استخدام الصورة الأصلية</button>
      </div>
      {working && <p role="status" className={styles.hint}>جاري إزالة الخلفية...</p>}
      {selection && <p role="status" className={styles.success}>{selection === 'processed' ? 'تم حفظ الصورة الشفافة وتفعيلها للمنتج.' : 'تم اختيار الصورة الأصلية. اضغطي «حفظ المنتج» لرفع الصورة وتفعيلها.'}</p>}
      {result && !selection && <p className={styles.hint}>«اعتماد النتيجة» يحفظ الصورة المعالجة وتعديلات المنتج الحالية.</p>}
      {result && !selection && <p className={styles.hint}>راجعي حواف المنتج والملصق والشعار، ثم اعتمدي النتيجة أو استخدمي الأصل.</p>}
      {(file || result || selection) && <button type="button" className={styles.reset} onClick={() => { request.current?.abort(); request.current = null; setWorking(false); setFile(null); setSourceUrl(null); setResult(null); setSelection(null); setError(''); setPreviewReady(false); onChange({ file: null, processed: null, confirmed: true, restore: false }) }}>التراجع عن تغيير الصورة</button>}
    </>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <footer className={styles.footer}>تُرسل الصورة إلى remove.bg عند الضغط على «إزالة الخلفية». المعاينة منخفضة الدقة ولا تُكبّر دقتها عند الحفظ. قد تبقى نصوص دعائية أو زخارف متداخلة؛ اعتماد النتيجة قرارك. شبكة المربعات للمعاينة فقط.</footer>
  </section>
}
