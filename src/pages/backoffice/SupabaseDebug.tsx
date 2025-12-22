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
  Settings,
  Shield,
  Key
} from 'lucide-react';
import { 
  supabase, 
  isSupabaseReady, 
  getConfigSource, 
  getSession,
  getUser 
} from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

interface DiagnosticResult {
  profiles: { found: boolean; status: string | null; error: string | null };
  userRoles: { found: boolean; roles: string[]; error: string | null };
  userPermissions: { count: number; error: string | null };
  legacyUsers: { found: boolean; role: string | null; status: string | null; error: string | null };
  isActiveStaff: { result: boolean | null; error: string | null };
  isAdmin: { result: boolean | null; error: string | null };
  crmAccess: { accounts: boolean; contacts: boolean; leads: boolean; error: string | null };
}

export default function SupabaseDebug() {
  const [sessionInfo, setSessionInfo] = useState<Session | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
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

  const runDiagnostic = async () => {
    if (!isReady || !supabase) {
      return;
    }

    setLoading(true);
    const result: DiagnosticResult = {
      profiles: { found: false, status: null, error: null },
      userRoles: { found: false, roles: [], error: null },
      userPermissions: { count: 0, error: null },
      legacyUsers: { found: false, role: null, status: null, error: null },
      isActiveStaff: { result: null, error: null },
      isAdmin: { result: null, error: null },
      crmAccess: { accounts: false, contacts: false, leads: false, error: null }
    };

    try {
      const currentUser = await getUser();
      const userId = currentUser?.id;

      if (!userId) {
        setDiagnostic(result);
        setLoading(false);
        return;
      }

      // Test 1: Check profiles table (NEW system)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, status, email, full_name')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        result.profiles.error = profileError.message;
      } else if (profileData) {
        result.profiles.found = true;
        result.profiles.status = profileData.status;
      }

      // Test 2: Check user_roles table (NEW system)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        result.userRoles.error = rolesError.message;
      } else if (rolesData && rolesData.length > 0) {
        result.userRoles.found = true;
        result.userRoles.roles = rolesData.map(r => r.role);
      }

      // Test 3: Check user_permissions table (NEW system)
      const { count: permCount, error: permError } = await supabase
        .from('user_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (permError) {
        result.userPermissions.error = permError.message;
      } else {
        result.userPermissions.count = permCount || 0;
      }

      // Test 4: Check legacy users table
      const { data: legacyData, error: legacyError } = await supabase
        .from('users')
        .select('id, role, status, auth_user_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (legacyError) {
        result.legacyUsers.error = legacyError.message;
      } else if (legacyData) {
        result.legacyUsers.found = true;
        result.legacyUsers.role = legacyData.role;
        result.legacyUsers.status = legacyData.status;
      }

      // Test 5: Call is_active_staff() RPC
      try {
        const { data: staffData, error: staffError } = await supabase.rpc('is_active_staff');
        if (staffError) {
          result.isActiveStaff.error = staffError.message;
        } else {
          result.isActiveStaff.result = staffData;
        }
      } catch (err: any) {
        result.isActiveStaff.error = err.message;
      }

      // Test 6: Call is_admin() RPC
      try {
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin');
        if (adminError) {
          result.isAdmin.error = adminError.message;
        } else {
          result.isAdmin.result = adminData;
        }
      } catch (err: any) {
        result.isAdmin.error = err.message;
      }

      // Test 7: CRM table access
      const { error: accountsErr } = await supabase.from('accounts').select('id').limit(1);
      result.crmAccess.accounts = !accountsErr;

      const { error: contactsErr } = await supabase.from('contacts').select('id').limit(1);
      result.crmAccess.contacts = !contactsErr;

      const { error: leadsErr } = await supabase.from('leads').select('id').limit(1);
      result.crmAccess.leads = !leadsErr;

      if (accountsErr || contactsErr || leadsErr) {
        result.crmAccess.error = [accountsErr?.message, contactsErr?.message, leadsErr?.message]
          .filter(Boolean).join('; ');
      }

      setDiagnostic(result);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  const getStatusBadge = (ok: boolean, label?: string) => (
    <Badge variant={ok ? 'default' : 'destructive'} className="gap-1">
      {ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label || (ok ? 'OK' : 'FAIL')}
    </Badge>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Diagnóstico de Supabase</h1>
        <p className="text-muted-foreground">
          Estado de configuración, permisos y acceso RLS
        </p>
      </div>

      <div className="space-y-4">
        {/* Configuración */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Estado:</span>
              {getStatusBadge(isReady, isReady ? 'Listo' : 'No configurado')}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Fuente:</span>
              <Badge variant="outline">
                {configSource === 'env' && '🔐 Variables de entorno'}
                {configSource === 'window' && '🌐 window.__SUPABASE__'}
                {configSource === 'none' && '❌ No configurado'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sesión */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Sesión de Usuario
              </span>
              <Button size="sm" variant="outline" onClick={fetchSessionInfo} disabled={loading || !isReady}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isReady ? (
              <p className="text-sm text-muted-foreground">Sin configuración</p>
            ) : loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : sessionInfo ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Autenticado:</span>
                  {getStatusBadge(true, 'Sí')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Email:</span>
                  <span className="text-sm">{userInfo?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">User ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{userInfo?.id || 'N/A'}</code>
                </div>
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Sin sesión</AlertTitle>
                <AlertDescription>Inicie sesión para continuar.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Diagnóstico de Permisos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sistema de Permisos
              </span>
              <Button size="sm" onClick={runDiagnostic} disabled={loading || !isReady || !sessionInfo}>
                <Database className="h-4 w-4 mr-1" />
                Ejecutar Diagnóstico
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!diagnostic ? (
              <p className="text-sm text-muted-foreground">
                Haz clic en "Ejecutar Diagnóstico" para verificar tu configuración de permisos
              </p>
            ) : (
              <div className="space-y-4">
                {/* NEW System: profiles */}
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    profiles (Sistema Nuevo)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Registro encontrado:</span>
                    {getStatusBadge(diagnostic.profiles.found)}
                    <span>Status:</span>
                    <Badge variant={diagnostic.profiles.status === 'active' ? 'default' : 'secondary'}>
                      {diagnostic.profiles.status || 'N/A'}
                    </Badge>
                  </div>
                  {diagnostic.profiles.error && (
                    <p className="text-xs text-destructive mt-2">Error: {diagnostic.profiles.error}</p>
                  )}
                </div>

                {/* NEW System: user_roles */}
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    user_roles (Sistema Nuevo)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Roles asignados:</span>
                    {getStatusBadge(diagnostic.userRoles.found)}
                    <span>Roles:</span>
                    <div className="flex gap-1 flex-wrap">
                      {diagnostic.userRoles.roles.length > 0 ? 
                        diagnostic.userRoles.roles.map(r => <Badge key={r} variant="outline">{r}</Badge>) :
                        <span className="text-muted-foreground">Ninguno</span>
                      }
                    </div>
                  </div>
                  {diagnostic.userRoles.error && (
                    <p className="text-xs text-destructive mt-2">Error: {diagnostic.userRoles.error}</p>
                  )}
                </div>

                {/* NEW System: user_permissions */}
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    user_permissions (Sistema Nuevo)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Permisos de módulo:</span>
                    <Badge variant={diagnostic.userPermissions.count > 0 ? 'default' : 'secondary'}>
                      {diagnostic.userPermissions.count} registros
                    </Badge>
                  </div>
                  {diagnostic.userPermissions.error && (
                    <p className="text-xs text-destructive mt-2">Error: {diagnostic.userPermissions.error}</p>
                  )}
                </div>

                {/* Legacy: users table */}
                <div className="border rounded-lg p-3 opacity-70">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    users (Sistema Legacy)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>Registro encontrado:</span>
                    {getStatusBadge(diagnostic.legacyUsers.found)}
                    <span>Role / Status:</span>
                    <span>{diagnostic.legacyUsers.role || 'N/A'} / {diagnostic.legacyUsers.status || 'N/A'}</span>
                  </div>
                  {diagnostic.legacyUsers.error && (
                    <p className="text-xs text-destructive mt-2">Error: {diagnostic.legacyUsers.error}</p>
                  )}
                </div>

                {/* RPC Functions */}
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2">Funciones RPC</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span>is_active_staff():</span>
                    {diagnostic.isActiveStaff.error ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      getStatusBadge(diagnostic.isActiveStaff.result === true)
                    )}
                    <span>is_admin():</span>
                    {diagnostic.isAdmin.error ? (
                      <Badge variant="destructive">Error</Badge>
                    ) : (
                      getStatusBadge(diagnostic.isAdmin.result === true)
                    )}
                  </div>
                  {(diagnostic.isActiveStaff.error || diagnostic.isAdmin.error) && (
                    <p className="text-xs text-destructive mt-2">
                      {diagnostic.isActiveStaff.error || diagnostic.isAdmin.error}
                    </p>
                  )}
                </div>

                {/* CRM Access */}
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold mb-2">Acceso CRM (RLS)</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      accounts: {getStatusBadge(diagnostic.crmAccess.accounts)}
                    </div>
                    <div className="flex items-center gap-1">
                      contacts: {getStatusBadge(diagnostic.crmAccess.contacts)}
                    </div>
                    <div className="flex items-center gap-1">
                      leads: {getStatusBadge(diagnostic.crmAccess.leads)}
                    </div>
                  </div>
                  {diagnostic.crmAccess.error && (
                    <p className="text-xs text-destructive mt-2">Error: {diagnostic.crmAccess.error}</p>
                  )}
                </div>

                {/* Summary / Action Items */}
                {(!diagnostic.profiles.found || !diagnostic.userRoles.found || diagnostic.isActiveStaff.result !== true) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Acción Requerida</AlertTitle>
                    <AlertDescription className="text-xs space-y-1">
                      {!diagnostic.profiles.found && (
                        <p>• Falta registro en <code>profiles</code> para tu user ID</p>
                      )}
                      {diagnostic.profiles.found && diagnostic.profiles.status !== 'active' && (
                        <p>• El status del perfil no es 'active' (actual: {diagnostic.profiles.status})</p>
                      )}
                      {!diagnostic.userRoles.found && (
                        <p>• Falta registro en <code>user_roles</code> para tu user ID</p>
                      )}
                      {diagnostic.isActiveStaff.result !== true && (
                        <p>• <code>is_active_staff()</code> retorna FALSE - sin acceso a módulos CRM</p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {diagnostic.isActiveStaff.result === true && diagnostic.crmAccess.accounts && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Todo OK</AlertTitle>
                    <AlertDescription>
                      Tu configuración de permisos está correcta. Tienes acceso a los módulos CRM.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}