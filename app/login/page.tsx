import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/session';
import LoginForm from './login-form';
export const dynamic='force-dynamic';
export const metadata={title:'Entrar · Abasto Xalapa'};
export default async function Login(){if(await getSessionUser())redirect('/');return <LoginForm/>}
