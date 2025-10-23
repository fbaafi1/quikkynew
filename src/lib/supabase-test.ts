import { createClient } from './supabase/server';

export async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');

    // Check environment variables
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Environment check:', {
      hasUrl,
      hasKey,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...'
    });

    if (!hasUrl || !hasKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Create client and test basic connection
    const supabase = await createClient();

    // Test a simple query
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }

    console.log('✅ Supabase connection successful!');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Supabase connection failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Test the connection
testSupabaseConnection().then(result => {
  console.log('Test result:', result);
});
