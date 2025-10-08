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
  const [pingResult, setPingResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [pingError, setPingError] = useState<string>('');
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
      setPingResult('error');
      setPingError('Supabase no está inicializado');
      return;
    }

    setLoading(true);
    setPingResult('idle');
    setPingError('');

    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('id')
        .limit(1);

      if (error) {
        setPingResult('error');
        setPingError(`${error.message} (code: ${error.code})`);
      } else {
        setPingResult('success');
      }
    } catch (err: any) {
      setPingResult('error');
      setPingError(err?.message || 'Error desconocido');
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
            ) : pingResult === 'idle' ? (
              <p className="text-sm text-muted-foreground">
                Haz clic en "Ping" para probar la conexión
              </p>
            ) : pingResult === 'success' ? (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Conexión exitosa</AlertTitle>
                <AlertDescription>
                  La consulta a la base de datos se ejecutó correctamente.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error de conexión</AlertTitle>
                <AlertDescription className="font-mono text-xs">
                  {pingError}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
