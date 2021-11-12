import { Button } from 'antd';
import React from 'react';
import styles from './info-block.module.scss';

export interface IContentField {
  field: string;
  label: string;
  type?: 'TEXT' | 'ATTACHMENT';
}

interface IProps {
  blockHeaderName: string;
  data: any; // Data为PlanObject
  displaySequence: Array<IContentField>; // data如果是object才使用这个字段
}

export default class InfoBlock extends React.PureComponent<IProps> {

  private _handleDownload = (url: string) => {
    window.open(url);
  }

  render() {
    const { blockHeaderName, data, displaySequence } = this.props;

    return (<div className={styles.infoBlockContainer}>
      <div className={styles.infoBlockHeader}>{blockHeaderName}</div>
      <div className={styles.contentContainer}>
        <div className={styles.plainObjectInfoContainer}>
          {
            displaySequence?.map((item: IContentField, idx: number) => {
              const fieldIsDownloadLink = item.type ? (item.type === 'ATTACHMENT') : false;

              return (<div key={blockHeaderName + idx} className={styles.infoItem}>
                <div className={styles.infoItemLabel}>{item.label}</div>
                <div className={styles.infoItemValue}>
                  {
                    fieldIsDownloadLink ? (
                      (data as any)[item.field] ? (<Button type={'link'} onClick={() => {
                        this._handleDownload((data as any)[item.field]);
                      }}>下载</Button>) : (<></>)
                    ) : (<>{(data as any)[item.field]}</>)
                  }

                </div>
              </div>);
            })
          }
        </div>

      </div>
    </div>);
  }
}
