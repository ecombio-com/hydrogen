import {redirect} from 'react-router';

export async function loader() {
  return redirect('/address');
}

export default function Checkout() {
  return null;
}
