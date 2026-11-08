import type {CustomerAddressInput} from '@shopify/hydrogen/customer-account-api-types';
import type {AddressFragment, CustomerFragment} from 'customer-accountapi.generated';
import {Loader2, Pencil, Plus, Trash2} from 'lucide-react';
import {useEffect, useState} from 'react';
import {data, useFetcher, useOutletContext} from 'react-router';
import type {Route} from './+types/($locale).account.addresses';
import {AccountPageHeader} from '~/components/account/page-header';
import {Badge} from '~/components/ui/badge';
import {Button} from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import {Input} from '~/components/ui/input';
import {Label} from '~/components/ui/label';
import {Switch} from '~/components/ui/switch';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: Route.MetaFunction = () => {
  return [{title: 'Addresses'}];
};

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();

  return {};
}

export async function action({request, context}: Route.ActionArgs) {
  const {customerAccount} = context;

  try {
    const form = await request.formData();

    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : null;
    if (!addressId) {
      throw new Error('You must provide an address id.');
    }

    // this will ensure redirecting to login never happen for mutatation
    const isLoggedIn = await customerAccount.isLoggedIn();
    if (!isLoggedIn) {
      return data(
        {error: {[addressId]: 'Unauthorized'}},
        {
          status: 401,
        },
      );
    }

    const defaultAddress = form.has('defaultAddress')
      ? String(form.get('defaultAddress')) === 'on'
      : false;
    const address: CustomerAddressInput = {};
    const keys: (keyof CustomerAddressInput)[] = [
      'address1',
      'address2',
      'city',
      'company',
      'territoryCode',
      'firstName',
      'lastName',
      'phoneNumber',
      'zoneCode',
      'zip',
    ];

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        address[key] = value;
      }
    }

    switch (request.method) {
      case 'POST': {
        // handle new address creation
        try {
          const {data, errors} = await customerAccount.mutate(
            CREATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressCreate?.userErrors?.length) {
            throw new Error(data?.customerAddressCreate?.userErrors[0].message);
          }

          if (!data?.customerAddressCreate?.customerAddress) {
            throw new Error('Customer address create failed.');
          }

          return {
            error: null,
            createdAddress: data?.customerAddressCreate?.customerAddress,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'PUT': {
        // handle address updates
        try {
          const {data, errors} = await customerAccount.mutate(
            UPDATE_ADDRESS_MUTATION,
            {
              variables: {
                address,
                addressId: decodeURIComponent(addressId),
                defaultAddress,
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressUpdate?.userErrors?.length) {
            throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
          }

          if (!data?.customerAddressUpdate?.customerAddress) {
            throw new Error('Customer address update failed.');
          }

          return {
            error: null,
            updatedAddress: address,
            defaultAddress,
          };
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      case 'DELETE': {
        // handles address deletion
        try {
          const {data, errors} = await customerAccount.mutate(
            DELETE_ADDRESS_MUTATION,
            {
              variables: {
                addressId: decodeURIComponent(addressId),
                language: customerAccount.i18n.language,
              },
            },
          );

          if (errors?.length) {
            throw new Error(errors[0].message);
          }

          if (data?.customerAddressDelete?.userErrors?.length) {
            throw new Error(data?.customerAddressDelete?.userErrors[0].message);
          }

          if (!data?.customerAddressDelete?.deletedAddressId) {
            throw new Error('Customer address delete failed.');
          }

          return {error: null, deletedAddress: addressId};
        } catch (error: unknown) {
          if (error instanceof Error) {
            return data(
              {error: {[addressId]: error.message}},
              {
                status: 400,
              },
            );
          }
          return data(
            {error: {[addressId]: error}},
            {
              status: 400,
            },
          );
        }
      }

      default: {
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {
            status: 405,
          },
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data(
        {error: error.message},
        {
          status: 400,
        },
      );
    }
    return data(
      {error},
      {
        status: 400,
      },
    );
  }
}

const COPY = {
  title: 'Addresses',
  description: 'Manage your saved addresses',
  add: 'Add address',
  addTitle: 'Add address',
  editTitle: 'Edit address',
  edit: 'Edit',
  delete: 'Delete',
  empty: 'You have no saved addresses yet.',
  isDefault: 'Default',
  setDefault: 'Set as default address',
  save: 'Save',
  cancel: 'Cancel',
  deleteTitle: 'Delete address?',
  deleteBody: 'This address will be permanently removed from your account.',
  fallbackError: 'Something went wrong. Please try again.',
};

type Address = CustomerFragment['addresses']['nodes'][number];
type FormState = {mode: 'create'} | {mode: 'edit'; address: Address} | null;
type Field = {
  autoComplete: string;
  key: keyof CustomerAddressInput;
  label: string;
  span: boolean;
  placeholder?: string;
};

const FIELDS: Field[] = [
  {autoComplete: 'given-name', key: 'firstName', label: 'First name', span: false},
  {autoComplete: 'family-name', key: 'lastName', label: 'Last name', span: false},
  {autoComplete: 'organization', key: 'company', label: 'Company', span: true},
  {autoComplete: 'address-line1', key: 'address1', label: 'Address', span: true},
  {autoComplete: 'address-line2', key: 'address2', label: 'Apartment, suite, etc.', span: true},
  {autoComplete: 'address-level2', key: 'city', label: 'City', span: false},
  {autoComplete: 'address-level1', key: 'zoneCode', label: 'State / Province code', span: false, placeholder: 'e.g. CA'},
  {autoComplete: 'postal-code', key: 'zip', label: 'ZIP / Postal code', span: false},
  {autoComplete: 'country', key: 'territoryCode', label: 'Country code', span: false, placeholder: 'e.g. US'},
  {autoComplete: 'tel', key: 'phoneNumber', label: 'Phone', span: true},
];

const REQUIRED = new Set<keyof CustomerAddressInput>(['address1', 'city', 'territoryCode']);

function valueOf(address: Address | undefined, key: string): string {
  const value = (address as unknown as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' ? value : '';
}

function errorFor(result: unknown, id: string): string | null {
  if (!result || typeof result !== 'object' || !('error' in result)) return null;
  const error = (result as {error: unknown}).error;
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const message = (error as Record<string, unknown>)[id];
    return message ? String(message) : COPY.fallbackError;
  }
  return COPY.fallbackError;
}

export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {defaultAddress, addresses} = customer;
  const [formState, setFormState] = useState<FormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  return (
    <>
      <AccountPageHeader title={COPY.title} description={COPY.description} />
      <div className="grid gap-4">
        <div>
          <Button size="sm" onClick={() => setFormState({mode: 'create'})}>
            <Plus aria-hidden="true" />
            {COPY.add}
          </Button>
        </div>

        {addresses.nodes.length === 0 ? (
          <div className="rounded-ds-md border p-6 text-center">
            <p className="text-ds-regular text-muted-foreground">{COPY.empty}</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {addresses.nodes.map((address) => (
              <li key={address.id} className="flex flex-col gap-3 rounded-ds-md border p-4">
                <div className="flex items-start justify-between gap-2">
                  <address className="text-ds-regular text-muted-foreground not-italic">
                    {(address.formatted ?? []).map((line, index) => (
                      <span key={index} className="block">
                        {line}
                      </span>
                    ))}
                  </address>
                  {defaultAddress?.id === address.id ? (
                    <Badge variant="secondary">{COPY.isDefault}</Badge>
                  ) : null}
                </div>
                <div className="mt-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFormState({mode: 'edit', address})}
                  >
                    <Pencil aria-hidden="true" />
                    {COPY.edit}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(address)}>
                    <Trash2 aria-hidden="true" />
                    {COPY.delete}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={formState !== null} onOpenChange={(open) => !open && setFormState(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{formState?.mode === 'edit' ? COPY.editTitle : COPY.addTitle}</DialogTitle>
          </DialogHeader>
          {formState !== null ? (
            <AddressForm
              key={formState.mode === 'edit' ? formState.address.id : 'create'}
              address={formState.mode === 'edit' ? formState.address : undefined}
              isCurrentDefault={
                formState.mode === 'edit' && defaultAddress?.id === formState.address.id
              }
              onSuccess={() => setFormState(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          {deleteTarget ? (
            <DeleteBody
              key={deleteTarget.id}
              target={deleteTarget}
              onClose={() => setDeleteTarget(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddressForm({
  address,
  isCurrentDefault,
  onSuccess,
}: {
  address?: Address;
  isCurrentDefault: boolean;
  onSuccess: () => void;
}) {
  const fetcher = useFetcher<typeof action>();
  const id = address?.id ?? 'NEW_ADDRESS_ID';
  const [isDefault, setIsDefault] = useState(isCurrentDefault);
  const pending = fetcher.state !== 'idle';
  const error = pending ? null : errorFor(fetcher.data, id);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && !errorFor(fetcher.data, id)) onSuccess();
  }, [fetcher.state, fetcher.data, id, onSuccess]);

  return (
    <fetcher.Form method={address ? 'PUT' : 'POST'} className="grid gap-4">
      <input type="hidden" name="addressId" value={id} />
      <input type="hidden" name="defaultAddress" value={isDefault ? 'on' : 'off'} />
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className={field.span ? 'grid gap-1.5 sm:col-span-2' : 'grid gap-1.5'}>
            <Label htmlFor={`${id}-${field.key}`}>
              {field.label}
              {REQUIRED.has(field.key) ? <span aria-hidden="true"> *</span> : null}
            </Label>
            <Input
              id={`${id}-${field.key}`}
              name={field.key}
              defaultValue={valueOf(address, field.key)}
              autoComplete={field.autoComplete}
              required={REQUIRED.has(field.key)}
              placeholder={field.placeholder}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-ds-md border p-3">
        <Label htmlFor={`${id}-isDefault`}>{COPY.setDefault}</Label>
        <Switch
          id={`${id}-isDefault`}
          checked={isDefault}
          disabled={isCurrentDefault}
          onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
        />
      </div>

      {error ? (
        <p role="alert" className="text-ds-regular text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : COPY.save}
        </Button>
      </DialogFooter>
    </fetcher.Form>
  );
}

function DeleteBody({target, onClose}: {target: Address; onClose: () => void}) {
  const fetcher = useFetcher<typeof action>();
  const pending = fetcher.state !== 'idle';
  const error = pending ? null : errorFor(fetcher.data, target.id);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && !errorFor(fetcher.data, target.id)) onClose();
  }, [fetcher.state, fetcher.data, target.id, onClose]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{COPY.deleteTitle}</DialogTitle>
        <DialogDescription>{COPY.deleteBody}</DialogDescription>
      </DialogHeader>
      {error ? (
        <p role="alert" className="text-ds-regular text-destructive">
          {error}
        </p>
      ) : null}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={pending}>
          {COPY.cancel}
        </Button>
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => fetcher.submit({addressId: target.id}, {method: 'DELETE'})}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : COPY.delete}
        </Button>
      </DialogFooter>
    </>
  );
}