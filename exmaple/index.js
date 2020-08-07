import React from 'react';
import ReactDOM from 'react-dom';
import './style.css';
import moduleStyle from './style.module.css';

ReactDOM.render(<div className="name">
  哈哈哈哈
  <h1 className={moduleStyle['title']}>我是标题</h1>
</div>, document.getElementById('root'));

