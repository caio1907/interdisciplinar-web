import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, Accordion, AccordionSummary, AccordionDetails, Card, CardHeader, CardContent, CardActions, MenuItem } from '@mui/material';
import * as Icon from '@mui/icons-material';
import { DataGrid, GridActionsCellItem, GridColDef, GridRowsProp, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { setLoading } from '../../utils/loadingState';
import { toast } from 'react-toastify';
import { useFormik } from 'formik';
import { database } from '../../services/firebase';
import * as Yup from 'yup';
import useStyle from './style';
import { translateMessageErrorToPTBR } from '../../utils/messageErrorsFirebase';
import ProductType from '../../types/Product.type';
import './styles.css'

const Products: React.FC = () => {
  const [formIsVisible, setFormIsVisible] = useState(false);
  const classes = useStyle();

  const dataGridColumns: GridColDef[] = [
    { field: 'id', headerName: 'Código', flex: 1 },
    { field: 'description', headerName: 'Descrição', flex: 1 },
    {
      field: 'image_url',
      headerName: 'Imagem',
      flex: 1,
      renderCell: param => (
        <img src={param.value} className='product_image' />
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
            label="Edit"
            className="textPrimary"
            onClick={() => handleEditClick(row)}
            color="inherit"
          />,
          <GridActionsCellItem
            disabled={formIsVisible}
            icon={<Icon.Delete color='error' filter={`grayscale(${formIsVisible ? '1' : '0'})`} />}
            label="Delete"
            onClick={() => handleDeleteClick(row.uid)}
            color="inherit"
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
        id: +doc.id
      })))
    });

    return () => {
      snapshot();
    }
  }, []); // eslint-disable-line

  const handleCancelClick = () => {
    setFormIsVisible(false);
    formik.resetForm();
  }

  const handleEditClick = (row: any) => {
    const { id, description, price, image, image_url, quantity } = row;
    formik.setValues({
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
    deleteDoc(doc(database, 'products', uid)).then(() => {
      toast.success('Item removido com sucesso');
    }).finally(() => {
      setLoading(false);
    })
  }

  const handleAddToolbarButton = () => {
    setFormIsVisible(true)
  }

  const formik = useFormik({
    initialValues: {
      id: 0,
      description: '',
      price: 0,
      image: '',
      image_url: '',
      quantity: 0
    },
    validationSchema: Yup.object({
      ean: Yup.string().required('EAN é obrigatório'),
      name: Yup.string().max(255).required('Nome é obrigatório'),
      min_quantity: Yup.number().required('Quantidade mínima é obrigatório'),
      quantity: Yup.number().required('Quantidade é obrigatório'),
    }),
    onSubmit: (values) => submit(values)
  });

  const submit = ({ id, description, price, image, image_url, quantity }: ProductType) => {
    setLoading(true);
    toast.dismiss();
    if (id) {
      setDoc(doc(database, 'catalog', id.toString()), {
        id,
        description,
        price,
        image,
        image_url,
        quantity
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
    addDoc(collection(database, 'catalog'), {
      id,
      description,
      price,
      image,
      image_url,
      quantity
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
                  label='Código'
                  error={Boolean(formik.touched.id && formik.errors.id)}
                  helperText={formik.touched.id && formik.errors.id}
                  margin='normal'
                  name='id'
                  onBlur={formik.handleBlur}
                  onChange={formik.handleChange}
                  type='text'
                  value={formik.values.id}
                />
                <TextField
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
