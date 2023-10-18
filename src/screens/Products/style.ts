import { makeStyles } from "@material-ui/core/styles";

export default makeStyles((theme) => ({
  accordionAlignCenter: {
    display: 'flex',
    justifyContent: 'center'
  },
  productImage: {
    marginTop: theme.spacing(1),
  },
  productImageGrid: {
    borderRadius: 40,
    width: 50,
    height: 50
  },
  productImageUpload: {
    display: 'flex',
    flexDirection: 'column',
    width: '20%'
  }
}));
