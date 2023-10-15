import React from 'react';
import logo from './logo.svg';
import imagem from './img/cervac.png'
import './Login.css';

const Login: React.FC = () => {
  return (

    <div className="App">

      <section className='login_comp'>
        <div className='div_user'><input className='user' placeholder='E-mail' /></div>
        <div className='div_password'><input className='password' placeholder='Senha' /></div>
        <div className='div_enter'><button className='enter'>Entrar</button></div>
      </section>

      <div className='login_screen_info'>
        <img src={imagem} />
      </div>

    </div>

  );
}

export default Login;
