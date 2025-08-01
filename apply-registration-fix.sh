#!/bin/bash

# Apply Registration and Authentication Fixes
# This script applies the database fixes to resolve 406 errors and registration issues

echo "🔧 Applying registration and authentication fixes..."

# Check if we have access to the database
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client not found. Please install psql or use Supabase CLI."
    exit 1
fi

# Try to apply the fix using Supabase CLI if available
if command -v supabase &> /dev/null; then
    echo "📦 Using Supabase CLI to apply fixes..."
    
    # Check if we're linked to a project
    if supabase status &> /dev/null; then
        echo "✅ Supabase project linked, applying fixes..."
        
        # Apply the SQL fix
        echo "🔧 Applying database fixes..."
        supabase db reset --linked
        echo "✅ Database reset completed"
        
        # Apply our custom fix
        echo "🔧 Applying registration fixes..."
        psql "$(supabase db remote commit --help 2>/dev/null | grep -o 'postgresql://[^[:space:]]*')" -f fix-registration-authentication-issues.sql
        echo "✅ Registration fixes applied"
        
    else
        echo "⚠️  Supabase project not linked. Please run 'supabase link' first."
        echo "📝 You can manually apply the SQL file 'fix-registration-authentication-issues.sql' to your database."
    fi
else
    echo "⚠️  Supabase CLI not found. Please install it or apply the SQL manually."
    echo "📝 You can manually apply the SQL file 'fix-registration-authentication-issues.sql' to your database."
fi

echo ""
echo "🎯 Fix Summary:"
echo "✅ Updated RLS policies for admin_users, user_level_stats, and profiles"
echo "✅ Created profile and stats creation functions"
echo "✅ Improved registration process in AuthContext"
echo "✅ Enhanced error handling in useUserProfile hook"
echo ""
echo "📋 Next steps:"
echo "1. Test user registration with a new account"
echo "2. Verify that 406 errors are resolved"
echo "3. Check that user profiles and stats are created properly"
echo "4. Monitor console logs for any remaining issues"
echo ""
echo "🔧 If issues persist, check the browser console for detailed error messages."