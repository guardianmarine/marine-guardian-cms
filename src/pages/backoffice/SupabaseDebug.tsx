import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  User,
  Settings
} from 'lucide-react';
import { 
  supabase, 
  isSupabaseReady, 
  getConfigSource, 
  getSession,
  getUser 
} from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export default function SupabaseDebug() {
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [pingResult, setPingResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const isReady = isSupabaseReady();
  const configSource = getConfigSource();

  const fetchSessionInfo = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      setSessionInfo(session);
      
      const user = await getUser();
      setUserInfo(user);
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

  const runPing = async () => {
    if (!isReady || !supabase) {
      setPingResult('❌ Supabase no está inicializado');
      return;
    }

    setLoading(true);
    setPingResult('🔄 Ejecutando diagnóstico...');

    try {
      // Test 1: Basic accounts query
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name')
        .limit(1);

      // Test 2: Check if user is in users table
      const currentUser = await getUser();
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role, status, auth_user_id')
        .eq('auth_user_id', currentUser?.id)
        .maybeSingle();

      // Test 3: Direct RPC call to is_active_staff (if exists)
      let isStaff: boolean | null = null;
      let staffError: any = null;
      try {
        const { data, error } = await supabase.rpc('is_active_staff');
        isStaff = data;
        staffError = error;
      } catch {
        // Function might not exist
      }

      // Test 4: Direct contacts count
      const firstAccountId = accountsData?.[0]?.id;
      let contactsTest = '';
      if (firstAccountId) {
        const { count: contactsCount, error: contactsError } = await supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('account_id', firstAccountId)
          .is('deleted_at', null);

        contactsTest = contactsError 
          ? `\n\n❌ Contacts query error: ${contactsError.message}`
          : `\n\n✅ Contacts count for "${accountsData[0].name}": ${contactsCount ?? 0}`;
      }

      // Test 5: Aggregated count with FK
      let aggTest = '';
      if (firstAccountId) {
        const { data: aggData, error: aggError } = await supabase
          .from('accounts')
          .select('id, name, contacts!account_id(count)')
          .eq('id', firstAccountId)
          .maybeSingle();

        aggTest = aggError
          ? `\n\n❌ Aggregated count error: ${aggError.message}`
          : `\n\n📊 Aggregated count result: ${aggData?.contacts?.[0]?.count ?? 'undefined'}\nRaw data: ${JSON.stringify(aggData?.contacts)}`;
      }

      const result = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SUPABASE RLS DIAGNOSTIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 Accounts Query:
${accountsError ? `❌ Error: ${accountsError.message}` : `✅ Found ${accountsData?.length || 0} accounts`}

👤 Current User in 'users' table:
${userError ? `❌ Query Error: ${userError.message}` : userData ? `✅ Found
   • Role: ${userData.role}
   • Status: ${userData.status}
   • Auth ID: ${userData.auth_user_id}` : '❌ User NOT FOUND in users table'}

🔐 is_active_staff() RPC:
${staffError ? `❌ Error: ${staffError.message}` : isStaff === null ? '⚠️ Function not found or not callable' : `${isStaff ? '✅' : '❌'} Returns: ${isStaff}`}
${contactsTest}
${aggTest}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 DIAGNOSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━

${!userData ? `⚠️ CRITICAL: Your auth user is NOT in the 'users' table.
   → RLS policies check is_active_staff() which queries users table
   → Without a users record, ALL CRM queries will be blocked
   → Solution: INSERT a record in users table with your auth_user_id` : ''}

${userData && userData.status !== 'active' ? `⚠️ WARNING: User status is "${userData.status}" (expected: "active")
   → is_active_staff() requires status = 'active'
   → Solution: UPDATE users SET status = 'active' WHERE id = '${userData.id}'` : ''}

${userData && !['admin','sales','inventory','finance','manager'].includes(userData.role) ? `⚠️ WARNING: Role "${userData.role}" not in allowed staff roles
   → is_active_staff() checks role IN ('admin','sales','inventory','finance','manager')
   → Solution: UPDATE users SET role = 'admin' WHERE id = '${userData.id}'` : ''}

${isStaff === false ? `⚠️ BLOCKER: is_active_staff() returns FALSE
   → You do not have staff access according to RLS
   → Check role, status, and auth_user_id mapping in users table` : ''}

${isStaff === true && contactsTest.includes('❌') ? `⚠️ WARNING: Staff access OK but contacts query failed
   → Possible contacts table RLS issue
   → Check contacts RLS policies align with accounts policies` : ''}

${isStaff === true && aggTest.includes('undefined') && contactsTest.includes('✅') && !contactsTest.includes(': 0') ? `⚠️ BUG FOUND: Direct count works but aggregated count is undefined
   → FK join syntax issue: contacts!account_id(count)
   → Try alternative: contacts!inner(count)
   → Or use direct count in application code` : ''}

${isStaff === true && !contactsTest.includes('❌') && !aggTest.includes('undefined') && userData ? `✅ ALL TESTS PASSED
   → Supabase connection: OK
   → User in users table: OK
   → Staff access: OK
   → Contacts readable: OK
   → Aggregated count: ${aggTest.match(/count result: (\d+)/)?.[1] || 'OK'}` : ''}
      `.trim();

      setPingResult(result);
    } catch (err: any) {
      setPingResult(`❌ EXCEPTION: ${err.message}\n\nStack: ${err.stack || 'No stack trace'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de Supabase</h1>
        <p className="text-muted-foreground">
          Estado actual de configuración y conexión
        </p>
      </div>

      <div className="space-y-4">
        {/* Estado de configuración */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Estado de inicialización:</span>
              {isReady ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Listo
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  No configurado
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Fuente de configuración:</span>
              <Badge variant="outline">
                {configSource === 'env' && '🔐 Variables de entorno (VITE_*)'}
                {configSource === 'window' && '🌐 window.__SUPABASE__'}
                {configSource === 'none' && '❌ No configurado'}
              </Badge>
            </div>

            {!isReady && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin configuración</AlertTitle>
                <AlertDescription>
                  Configure VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las
                  variables de entorno, o defina window.__SUPABASE__ en
                  index.html.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Información de sesión */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sesión de usuario
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchSessionInfo}
                disabled={loading || !isReady}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isReady ? (
              <p className="text-sm text-muted-foreground">
                No se puede verificar sin configuración
              </p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : sessionInfo ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Autenticado:</span>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Sí
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Email:</span>
                  <span className="text-sm">{userInfo?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">User ID:</span>
                  <span className="text-sm font-mono text-xs">
                    {userInfo?.id || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Expira en:</span>
                  <span className="text-sm">
                    {sessionInfo.expires_at
                      ? new Date(sessionInfo.expires_at * 1000).toLocaleString()
                      : 'N/A'}
                  </span>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin sesión</AlertTitle>
                <AlertDescription>
                  No hay una sesión activa. Inicie sesión para continuar.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Ping a la base de datos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Prueba de conexión
              </span>
              <Button
                size="sm"
                onClick={runPing}
                disabled={loading || !isReady}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Ping
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isReady ? (
              <p className="text-sm text-muted-foreground">
                No se puede hacer ping sin configuración
              </p>
            ) : !pingResult ? (
              <p className="text-sm text-muted-foreground">
                Haz clic en "Ping" para ejecutar el diagnóstico completo
              </p>
            ) : (
              <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap">
                {pingResult}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
