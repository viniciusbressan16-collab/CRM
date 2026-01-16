
import { createClient } from '@supabase/supabase-js'
import { Database } from './types/supabase'

const supabase = createClient<Database, 'public'>('url', 'key')

async function test() {
    // Test pipelines insert
    await supabase.from('pipelines').insert({ name: 'test', order_index: 1 })

    // Test deals update
    await supabase.from('deals').update({ title: 'New Title' }).eq('id', '123')
}
