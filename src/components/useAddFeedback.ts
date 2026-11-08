'use client'

import {useEffect,useRef,useState} from 'react'

export function useAddFeedback() {
  const [pending,setPending]=useState(false),[added,setAdded]=useState(false),[error,setError]=useState('')
  const busy=useRef(false),mounted=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|null>(null)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current)}},[])
  const reset=()=>{if(timer.current)clearTimeout(timer.current);setAdded(false);setError('')}
  const run=async(action:()=>void|boolean|Promise<void|boolean>)=>{
    if(busy.current)return false
    busy.current=true;reset();setPending(true)
    try {
      if(await action()===false)throw new Error('Addition rejected')
      if(mounted.current){setAdded(true);timer.current=setTimeout(()=>setAdded(false),1500)}
      return true
    }catch{
      if(mounted.current)setError('تعذّرت الإضافة. تحقّق من الكمية المتاحة وحاول مجددًا.')
      return false
    }finally{busy.current=false;if(mounted.current)setPending(false)}
  }
  return {pending,added,error,setError,run,reset}
}
