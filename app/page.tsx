import {redirect} from 'next/navigation';
import {getSessionUser} from '@/lib/session';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default async function Page(){if(!(await getSessionUser()))redirect('/login');return <Workspace/>}
