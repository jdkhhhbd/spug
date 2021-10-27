/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react';
import { Tabs, Tree, Input, Spin } from 'antd';
import { FolderOutlined, FolderOpenOutlined, CloudServerOutlined, SearchOutlined } from '@ant-design/icons';
import { NotFound, AuthButton } from 'components';
import Terminal from './Terminal';
import FileManager from './FileManager';
import { http, hasPermission, includes } from 'libs';
import styles from './index.module.less';
import LogoSpugText from 'layout/logo-spug-txt.png';
import lds from 'lodash';


function WebSSH(props) {
  const [visible, setVisible] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [rawTreeData, setRawTreeData] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [searchValue, setSearchValue] = useState();
  const [hosts, setHosts] = useState([]);
  const [activeId, setActiveId] = useState();
  const [hostId, setHostId] = useState();

  useEffect(() => {
    window.document.title = 'Spug web terminal'
    window.addEventListener('beforeunload', leaveTips)
    http.get('/api/host/group/?with_hosts=1')
      .then(res => setRawTreeData(res.treeData))
      .finally(() => setFetching(false))
    return () => window.removeEventListener('beforeunload', leaveTips)
  }, [])

  useEffect(() => {
    if (searchValue) {
      const newTreeData = []
      const loop = (data) => {
        for (let item of data) {
          if (item.children) {
            loop(item.children)
          } else if (item.isLeaf && includes(item.title, searchValue)) {
            newTreeData.push(item)
          }
        }
      }
      loop(rawTreeData)
      setTreeData(newTreeData)
    } else {
      setTreeData(rawTreeData)
    }
  }, [rawTreeData, searchValue])

  function leaveTips(e) {
    e.returnValue = '确定要离开页面？'
  }

  function handleSelect(e) {
    if (e.nativeEvent.detail > 1 && e.node.isLeaf) {
      e.node.vId = String(new Date().getTime())
      hosts.push(e.node);
      setHosts(lds.cloneDeep(hosts))
      setActiveId(e.node.vId)
    }
  }

  function handleRemove(key, action) {
    if (action === 'remove') {
      const index = lds.findIndex(hosts, x => x.vId === key);
      if (index !== -1) {
        hosts.splice(index, 1);
        setHosts(lds.cloneDeep(hosts));
        if (hosts.length > index) {
          setActiveId(hosts[index].vId)
        } else if (hosts.length) {
          setActiveId(hosts[index - 1].vId)
        } else {
          setActiveId(undefined)
        }
      }
    }
  }

  function handleOpenFileManager() {
    const index = lds.findIndex(hosts, x => x.vId === activeId);
    if (index !== -1) {
      setHostId(hosts[index].id)
      setVisible(true)
    }
  }

  function renderIcon(node) {
    if (node.isLeaf) {
      return <CloudServerOutlined/>
    } else if (node.expanded) {
      return <FolderOpenOutlined/>
    } else {
      return <FolderOutlined/>
    }
  }

  const spug_web_terminal =
    '                                                 __       __                          _                __\n' +
    '   _____ ____   __  __ ____ _   _      __ ___   / /_     / /_ ___   _____ ____ ___   (_)____   ____ _ / /\n' +
    '  / ___// __ \\ / / / // __ `/  | | /| / // _ \\ / __ \\   / __// _ \\ / ___// __ `__ \\ / // __ \\ / __ `// / \n' +
    ' (__  )/ /_/ // /_/ // /_/ /   | |/ |/ //  __// /_/ /  / /_ /  __// /   / / / / / // // / / // /_/ // /  \n' +
    '/____// .___/ \\__,_/ \\__, /    |__/|__/ \\___//_.___/   \\__/ \\___//_/   /_/ /_/ /_//_//_/ /_/ \\__,_//_/   \n' +
    '     /_/            /____/                                                                               \n'

  return hasPermission('host.console.view') ? (
    <div className={styles.container}>
      <div className={styles.sider}>
        <div className={styles.logo}>
          <img src={LogoSpugText} alt="logo"/>
        </div>
        <div className={styles.hosts}>
          <Spin spinning={fetching}>
            <Input allowClear className={styles.search} prefix={<SearchOutlined style={{color: '#999'}}/>}
                   placeholder="输入检索" onChange={e => setSearchValue(e.target.value)}/>
            <Tree.DirectoryTree
              defaultExpandAll
              expandAction="doubleClick"
              treeData={treeData}
              icon={renderIcon}
              onSelect={(k, e) => handleSelect(e)}/>
          </Spin>
        </div>
      </div>
      <div className={styles.content}>
        <Tabs
          hideAdd
          activeKey={activeId}
          type="editable-card"
          onTabClick={key => setActiveId(key)}
          onEdit={handleRemove}
          tabBarExtraContent={<AuthButton
            auth="host.console.list"
            type="primary"
            disabled={!activeId}
            style={{marginRight: 5}}
            onClick={handleOpenFileManager}
            icon={<FolderOpenOutlined/>}>文件管理器</AuthButton>}>
          {hosts.map(item => (
            <Tabs.TabPane key={item.vId} tab={item.title}>
              <Terminal id={item.id} vId={item.vId} activeId={activeId}/>
            </Tabs.TabPane>
          ))}
        </Tabs>
        {hosts.length === 0 && (
          <pre className={styles.fig}>{spug_web_terminal}</pre>
        )}
      </div>
      <FileManager id={hostId} visible={visible} onClose={() => setVisible(false)}/>
    </div>
  ) : (
    <div style={{height: '100vh'}}>
      <NotFound/>
    </div>
  )
}

export default observer(WebSSH)