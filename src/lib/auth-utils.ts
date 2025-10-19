import { createClient } from './supabase/server';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

export async function getCurrentVendor() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const supabase = await createClient();
  const { data: vendor, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  if (error) return null;
  return vendor;
}
