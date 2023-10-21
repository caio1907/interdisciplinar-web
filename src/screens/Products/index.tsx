import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  styled
} from '@mui/material';
import * as Icon from '@mui/icons-material';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowsProp, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { setLoading } from '../../utils/loadingState';
import { translateMessageErrorToPTBR } from '../../utils/messageErrorsFirebase';
import { database, storage } from '../../services/firebase';
import ProductType from '../../types/Product.type';
import useStyle from './style';

const Products: React.FC = () => {
  const [formIsVisible, setFormIsVisible] = useState(false);
  const classes = useStyle();
  const [fileImage, setFileImage] = useState<File>();

  const dataGridColumns: GridColDef[] = [
    { field: 'id', headerName: 'Código', flex: 1 },
    { field: 'description', headerName: 'Descrição', flex: 1 },
    {
      field: 'image_url',
      headerName: 'Imagem',
      flex: 1,
      renderCell: param => (
        <img src={param.value} className={classes.productImageGrid} alt={param.row.description} />
      )
    },
    { field: 'quantity', headerName: 'Quantidade', flex: 1 },
    {
      field: 'actions',
      headerName: 'Ações',
      type: 'actions',
      maxWidth: 100,
      getActions: (params) => {
        const { row } = params;

        return [
          <GridActionsCellItem
            disabled={formIsVisible}
            icon={<Icon.Edit color='warning' filter={`grayscale(${formIsVisible ? '1' : '0'})`} />}
            label='Edit'
            className='textPrimary'
            onClick={() => handleEditClick(row)}
            color='inherit'
          />,
          <GridActionsCellItem
            disabled={formIsVisible}
            icon={<Icon.Delete color='error' filter={`grayscale(${formIsVisible ? '1' : '0'})`} />}
            label='Delete'
            onClick={() => handleDeleteClick(row.uid)}
            color='inherit'
          />
        ];
      }
    }
  ];

  const [dataGridRows, setDataGridRows] = useState<GridRowsProp>([]);

  useEffect(() => {
    const snapshot = onSnapshot(collection(database, 'catalog'), snapshot => {
      setDataGridRows(snapshot.docs.map(doc => ({
        ...(doc.data() as ProductType),
        id: +doc.id,
        uid: doc.id
      })))
    });

    return () => {
      snapshot();
    }
  }, []); // eslint-disable-line

  const handleCancelClick = () => {
    setFormIsVisible(false);
    formik.resetForm();
    setFileImage(undefined);
  }

  const handleEditClick = (row: any) => {
    const { uid, id, description, price, image, image_url, quantity } = row;
    formik.setValues({
      uid,
      id,
      description,
      price,
      image,
      image_url,
      quantity
    });
    setFormIsVisible(true);
  }

  const handleDeleteClick = (uid: string) => {
    const isDelete = window.confirm('Deseja deletar o item?')
    if (!isDelete) return;
    setLoading(true);

    const imageName = dataGridRows.find(item => item.uid === uid)?.image;
    const imageRef = ref(storage, `catalog/${imageName}`);
    deleteObject(imageRef).catch(() => {
      toast.error('Erro ao deletar imagem da base de dados.')
    });

    deleteDoc(doc(database, 'catalog', uid)).then(() => {
      toast.success('Item removido com sucesso');
    }).finally(() => {
      setLoading(false);
    })
  }

  const handleAddToolbarButton = () => {
    formik.resetForm();
    formik.values.id = dataGridRows[dataGridRows.length - 1].id + 1;
    setFormIsVisible(true)
  }

  const formik = useFormik({
    initialValues: {
      uid: '',
      id: 0,
      description: '',
      price: 0,
      image: '',
      image_url: '',
      quantity: 0
    },
    validationSchema: Yup.object({
      id: Yup.number().required('Código é obrigatório'),
      description: Yup.string().max(255).required('Nome é obrigatório'),
      quantity: Yup.number().required('Quantidade é obrigatório'),
      price: Yup
        .number()
        .required('Preço é obrigatório')
        .test('two-decimals', 'Preço deve conter 2 casas decimais.', (value: any) => value && /^\d+(\.\d{0,2})?$/.test(value))
    }),
    onSubmit: (values) => submit(values)
  });

  const submit = async ({ uid, id, description, price, image, image_url, quantity }: ProductType) => {
    setLoading(true);
    toast.dismiss();
    if (!uid) {
      if (idExists(id)) {
        toast.error(`Já existe um produto com esse código.`)
        setLoading(false);
        return;
      }
    }
    if (uid) {
      const uploadedFileData = { image, image_url };
      if (fileImage) {
        const uploadedFile = await uploadFile();
        if (!uploadedFile) {
          toast.error('Erro ao enviar imagem.');
          return;
        }
        uploadedFileData.image = uploadedFile.image;
        uploadedFileData.image_url = uploadedFile.image_url;
      }
      setDoc(doc(database, 'catalog', uid), {
        description,
        price,
        quantity,
        ...uploadedFileData
      }).then(() => {
        toast.success('Item alterado com sucesso');
      }).catch(error => {
        toast.error(translateMessageErrorToPTBR(error.code) ?? error.message);
      }).finally(() => {
        formik.resetForm();
        setLoading(false);
        setFormIsVisible(false);
      })
      return;
    }
    if (!fileImage) {
      toast.warning('Selecione uma imagem.');
      setLoading(false);
      return;
    }
    const uploadedFile = await uploadFile();
    if (!uploadedFile) {
      toast.error('Erro ao enviar imagem.');
      return;
    }
    setDoc(doc(database, 'catalog', id.toString()), {
      description,
      price,
      quantity,
      ...uploadedFile
    }).then(() => {
      toast.success('Item cadastrado com sucesso')
    }).catch(error => {
      toast.error(translateMessageErrorToPTBR(error.code) ?? error.message);
    }).finally(() => {
      formik.resetForm();
      setLoading(false);
      setFormIsVisible(false);
    })
  }

  const idExists = (id: any) => {
    for (let c = 0; c < dataGridRows.length; c++) {
      if (id === dataGridRows[c].id) {
        return true;
      }
    }
    return false;
  }

  const uploadFile = async () => {
    if (!fileImage) return;
    const storageRef = ref(storage, `catalog/${fileImage.name}`);

    const resultUploadBytes = await uploadBytes(storageRef, fileImage);

    if (!resultUploadBytes) {
      return false;
    }

    const { name } = resultUploadBytes.ref;
    const storageRefDownloadURL = ref(storage, `catalog/${name}`);
    const image_url = await getDownloadURL(storageRefDownloadURL);

    setFileImage(undefined);
    return { image: name, image_url };
  }

  const AddToolbarButton: React.FC = () => {
    return (
      <GridToolbarContainer>
        <Button
          disabled={formIsVisible}
          startIcon={<Icon.Add />}
          onClick={handleAddToolbarButton}>
          Adicionar item
        </Button>
        <GridToolbarExport />
      </GridToolbarContainer>
    )
  }

  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
  });

  return (
    <div>
      <Accordion expanded={formIsVisible}>
        <AccordionSummary sx={{ display: 'none' }}></AccordionSummary>
        <AccordionDetails className={classes.accordionAlignCenter}>
          <Card variant='outlined' sx={{ mb: 2 }}>
            <CardHeader
              title='Cadastrar/Editar Item'
              sx={{
                pb: 0
              }}
            />
            <CardContent>
              <Box
                component={'form'}
                onSubmit={formik.handleSubmit}
                noValidate
                sx={{
                  '& .MuiTextField-root': { m: 1, minWidth: '25ch' },
                }}
              >
                <TextField
                  fullWidth
                  label='Código'
                  error={Boolean(formik.touched.id && formik.errors.id)}
                  helperText={formik.touched.id && formik.errors.id}
                  margin='normal'
                  name='id'
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type='text'
                  value={formik.values.id}
                  disabled={Boolean(formik.values.uid)}
                />
                <TextField
                  fullWidth
                  label='Descrição'
                  error={Boolean(formik.touched.description && formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                  margin='normal'
                  name='description'
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type='text'
                  value={formik.values.description}
                />
                <TextField
                  fullWidth
                  label='Quantidade'
                  error={Boolean(formik.touched.quantity && formik.errors.quantity)}
                  helperText={formik.touched.quantity && formik.errors.quantity}
                  margin='normal'
                  name='quantity'
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type='text'
                  value={formik.values.quantity}
                />
                <TextField
                  fullWidth
                  label='Preço'
                  error={Boolean(formik.touched.price && formik.errors.price)}
                  helperText={formik.touched.price && formik.errors.price}
                  margin='normal'
                  name='price'
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type='text'
                  value={formik.values.price}
                />
                <div className={classes.productImageUpload}>
                  <Button component='label' variant='contained' startIcon={<Icon.CloudUpload />}>
                    Imagem
                    <VisuallyHiddenInput type='file' onChange={event => setFileImage(event.target.files?.[0])}></VisuallyHiddenInput>
                  </Button>
                  {(formik.values.image_url || fileImage) && <img className={classes.productImage} src={fileImage ? URL.createObjectURL(fileImage) : formik.values.image_url} alt='imagem' />}
                </div>
              </Box>
            </CardContent>
            <CardActions sx={{ display: 'flex', justifyContent: 'end' }}>
              <Button color='error' onClick={handleCancelClick}>Cancelar</Button>
              <Button color='success' onClick={formik.submitForm}>Salvar</Button>
            </CardActions>
          </Card>
        </AccordionDetails>
      </Accordion>
      <DataGrid
        columns={dataGridColumns}
        rows={dataGridRows}
        rowSelection={false}
        slots={{
          toolbar: AddToolbarButton
        }}
      />
    </div>
  );
};

export default Products;
