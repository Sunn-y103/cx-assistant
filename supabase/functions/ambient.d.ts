declare module 'jsr:*'

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js'
}

declare module 'npm:*' {
  const content: any
  export default content
}
