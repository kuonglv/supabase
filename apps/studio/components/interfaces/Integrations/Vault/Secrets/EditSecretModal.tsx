import { isEmpty } from 'lodash'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useProjectContext } from 'components/layouts/ProjectLayout/ProjectContext'
import { GenericSkeletonLoader } from 'components/ui/ShimmeringLoader'
import { usePgSodiumKeyCreateMutation } from 'data/pg-sodium-keys/pg-sodium-key-create-mutation'
import { useVaultSecretDecryptedValueQuery } from 'data/vault/vault-secret-decrypted-value-query'
import { useVaultSecretUpdateMutation } from 'data/vault/vault-secret-update-mutation'
import type { VaultSecret } from 'types'
import { Button, Form, Input, Modal } from 'ui'
import EncryptionKeySelector from '../Keys/EncryptionKeySelector'
import { EyeOff, Eye } from 'lucide-react'

interface EditSecretModalProps {
  selectedSecret: VaultSecret | undefined
  onClose: () => void
}

const EditSecretModal = ({ selectedSecret, onClose }: EditSecretModalProps) => {
  const [selectedKeyId, setSelectedKeyId] = useState<string>()
  const [showSecretValue, setShowSecretValue] = useState(false)
  const { project } = useProjectContext()

  const { mutateAsync: addKeyMutation } = usePgSodiumKeyCreateMutation()
  const { mutateAsync: updateSecret } = useVaultSecretUpdateMutation()

  let INITIAL_VALUES = {
    name: selectedSecret?.name ?? '',
    description: selectedSecret?.description ?? '',
    secret: selectedSecret?.decryptedSecret ?? '',
  }

  useEffect(() => {
    if (selectedSecret !== undefined) {
      setShowSecretValue(false)
      setSelectedKeyId(selectedSecret.key_id)
    }
  }, [selectedSecret])

  const validate = (values: any) => {
    const errors: any = {}
    if (values.name.length === 0) errors.name = 'Please provide a name for your secret'
    if (values.secret.length === 0) errors.secret = 'Please enter your secret value'
    return errors
  }

  const onUpdateSecret = async (values: any, { setSubmitting }: any) => {
    if (!project) return console.error('Project is required')

    try {
      const payload: Partial<VaultSecret> = {}
      if (values.name !== selectedSecret?.name) payload.name = values.name
      if (values.description !== selectedSecret?.description)
        payload.description = values.description
      if (selectedKeyId !== selectedSecret?.key_id) {
        let encryptionKeyId = selectedKeyId
        if (encryptionKeyId === 'create-new') {
          const addKeyRes = await addKeyMutation({
            projectRef: project?.ref!,
            connectionString: project?.connectionString,
            name: values.keyName || undefined,
          })
          if (addKeyRes.error) {
            return toast.error(`Failed to create new key: ${addKeyRes.error.message}`)
          } else {
            encryptionKeyId = addKeyRes[0].id
          }
        }

        payload.key_id = encryptionKeyId
      }
      payload.secret = values.secret

      if (!isEmpty(payload) && selectedSecret) {
        setSubmitting(true)
        const res = await updateSecret({
          projectRef: project.ref,
          connectionString: project?.connectionString,
          id: selectedSecret.id,
          ...payload,
        })
        if (!res.error) {
          toast.success('Successfully updated secret')
          setSubmitting(false)
          onClose()
        } else {
          toast.error(`Failed to update secret: ${res.error.message}`)
          setSubmitting(false)
        }
      }
    } finally {
    }
  }

  return (
    <Modal
      hideFooter
      size="medium"
      visible={selectedSecret !== undefined}
      onCancel={onClose}
      header={<h5 className="text-sm text-foreground">Edit secret</h5>}
    >
      <Form
        id="add-new-secret-form"
        initialValues={INITIAL_VALUES}
        validate={validate}
        validateOnBlur={false}
        onSubmit={onUpdateSecret}
      >
        {({ isSubmitting, resetForm }: any) => {
          const {
            data,
            isLoading: isLoadingSecretValue,
            isSuccess: isSuccessSecretValue,
            // [Joshen] JFYI this is breaking rules of hooks, will be fixed once we move to
            // using react hook form instead
            // eslint-disable-next-line react-hooks/rules-of-hooks
          } = useVaultSecretDecryptedValueQuery(
            {
              projectRef: project?.ref!,
              id: selectedSecret?.id!,
              connectionString: project?.connectionString,
            },
            { enabled: selectedSecret !== undefined && !!(project?.ref && selectedSecret?.id) }
          )

          // [Joshen] JFYI this is breaking rules of hooks, will be fixed once we move to
          // using react hook form instead
          // eslint-disable-next-line react-hooks/rules-of-hooks
          useEffect(() => {
            if (selectedSecret !== undefined && isSuccessSecretValue) {
              resetForm({
                values: { ...INITIAL_VALUES, secret: data },
                initialValues: { ...INITIAL_VALUES, secret: data },
              })
            }
          }, [selectedSecret, isSuccessSecretValue])

          return isLoadingSecretValue ? (
            <Modal.Content>
              <GenericSkeletonLoader />
            </Modal.Content>
          ) : (
            <>
              <Modal.Content className="space-y-4">
                <Input id="name" label="Name" />
                <Input id="description" label="Description" labelOptional="Optional" />
                <Input
                  id="secret"
                  type={showSecretValue ? 'text' : 'password'}
                  label="Secret value"
                  actions={
                    <div className="mr-1">
                      <Button
                        type="default"
                        icon={showSecretValue ? <EyeOff /> : <Eye />}
                        onClick={() => setShowSecretValue(!showSecretValue)}
                      />
                    </div>
                  }
                />
              </Modal.Content>
              {/*
              <Modal.Separator />
              <Modal.Content className="space-y-4">
                <EncryptionKeySelector
                  nameId="keyName"
                  label="Select a key to encrypt your secret with"
                  labelOptional="Optional"
                  selectedKeyId={selectedKeyId}
                  onSelectKey={setSelectedKeyId}
                />
              </Modal.Content> */}
              <Modal.Separator />
              <Modal.Content className="flex items-center justify-end space-x-2">
                <Button type="default" disabled={isSubmitting} onClick={() => onClose()}>
                  Cancel
                </Button>
                <Button htmlType="submit" disabled={isSubmitting} loading={isSubmitting}>
                  Update secret
                </Button>
              </Modal.Content>
            </>
          )
        }}
      </Form>
    </Modal>
  )
}

export default EditSecretModal
