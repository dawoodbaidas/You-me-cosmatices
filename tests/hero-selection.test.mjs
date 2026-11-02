import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectHeroProducts } from '../src/lib/taxonomy.ts'
test('hero represents available departments and prefers distinct active images', () => {
 const products = [
 {id:'a',slug:'a',category:'mist',categoryLabel:'عطور رجالية',imageUrl:'/a',isActive:true},
 {id:'b',slug:'b',category:'mist',categoryLabel:'عطور نسائية',imageUrl:'/b',isActive:true},
 {id:'c',slug:'c',category:'makeup',categoryLabel:'مكياج',imageUrl:'/c'},
 {id:'d',slug:'d',category:'makeup',categoryLabel:'مكياج',imageUrl:'/d',isActive:false},
 ]
 const result=selectHeroProducts(products)
 assert.ok(result.some(p=>p.id==='a'))
 assert.ok(result.some(p=>p.id==='b'))
 assert.ok(result.some(p=>p.id==='c'))
 assert.ok(result.every(p=>p.id!=='d'))
 assert.deepEqual(selectHeroProducts([]),[])
})
