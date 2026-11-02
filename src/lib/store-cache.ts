import { revalidatePath, revalidateTag } from 'next/cache'
import { STORE_CATALOGUE_TAG } from './store-catalogue'

export function invalidateStoreCatalogue() {
  // Expire immediately: the next visitor must not receive stale prices or stock.
  revalidateTag(STORE_CATALOGUE_TAG, { expire: 0 })
  revalidatePath('/category', 'layout')
  revalidatePath('/')
  revalidatePath('/admin')
}
