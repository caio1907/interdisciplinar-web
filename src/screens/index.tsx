import React from 'react';
import Dashboard from './Dashboard';
import * as Icon from '@mui/icons-material'
import Products from './Products';

export interface ScreenProps {
  path: string
  name: string
  icon: JSX.Element
  component: React.ReactNode
}

const screens: ScreenProps[] = [
  {
    name: 'Dashboard',
    path: '/',
    component: <Dashboard />,
    icon: <Icon.Home />
  },
  {
    name: 'Produtos',
    path: '/products',
    component: <Products />,
    icon: <Icon.Window />
  }
];
export default screens;
