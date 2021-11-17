/* eslint-disable max-lines */

import { Button, Col, DatePicker, Form, Input, Row, Select } from 'antd';
import { FormInstance } from 'antd/lib/form';
import moment from 'moment';
import qs from 'qs';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import '../../antd.css';
import styles from './list-query.module.scss';

const { Item } = Form;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface IListQueryProps {
  title: string;
  items: Array<IListQueryItem>;
  cols: number; // 分几列显示
  getDictDataFn: (reqUrl: string, queryWord: string) => Promise<Array<IDictItem>>;

  onConditionChange?: (vals: object) => void;
}

interface IListQueryStates {
  searchOptions: {
    [_key: string] : Array<{
      label: string;
      value: string;
    }>;
  }; // 存储远程搜索的结果,key值跟props传过来的REMOTE_SEARCH的key相同
}

export interface IDictItem {
  label: string;
  value: string;
}

class ListQuery extends React.Component<IListQueryProps & RouteComponentProps, IListQueryStates> {
    constructor(props: IListQueryProps & RouteComponentProps) {
        super(props);
        this.state = {
            searchOptions: {},
        };
    }
  formRef = React.createRef<FormInstance>();

  componentDidMount() {
      // 页面重新载入后，需要设置页面值，并且要触发一次onConditionChange来通知父组件加载数据
      const mergedDataRage = this._getDateRangeFromQs();
      const mergedRemoteVals = this._getRemoteValFromQs();
      const qsStr = this.props.location.search.replace('?', '');
      const qsObj = qs.parse(qsStr);
      const newFieldsVals = Object.assign({}, {
          ...qsObj,
          ...mergedRemoteVals,
          ...mergedDataRage,
      });
    this.formRef.current?.setFieldsValue(newFieldsVals);
    this.props.onConditionChange?.(qsObj);
  }

  componentDidUpdate(prevProps: IListQueryProps & RouteComponentProps) {
      // 外部触发url变化(分页触发，tab触发等,需要先过滤掉组件的数据字段)后,会走这个事件，设改变之后需要触发onConditionChange来通知父组件更新
      // DATE_RANGE之类的时间数组修改成xxxStartDate和xxxEndDate两个属性,setFieldsValue之前要将xxxStartDate和xxxEndDate合并
      const prevQsStr = prevProps.location.search.replace('?', '');
      const prevQsObj = qs.parse(prevQsStr);
      const currQsStr = this.props.location.search.replace('?', '');
      const currQsObj = qs.parse(currQsStr);
      const formKeys = this.props.items.map(item => item.fieldName);
      formKeys.forEach(formKey => {
          delete prevQsObj[formKey];
          delete currQsObj[formKey];

          delete prevQsObj[formKey + 'StartDate'];
          delete currQsObj[formKey + 'StartDate'];

          delete prevQsObj[formKey + 'EndDate'];
          delete currQsObj[formKey + 'EndDate'];

          delete prevQsObj[formKey + 'Label'];
          delete currQsObj[formKey + 'Label'];

          delete prevQsObj[formKey + 'Value'];
          delete currQsObj[formKey + 'Value'];

      });
      let isSame = true;
      Object.keys(currQsObj).forEach(qsKey => {
          if (currQsObj[qsKey] !== prevQsObj[qsKey]) {
              isSame = false;
          }
      });
      if (isSame) {
          return;
      }
      // 不相同就要触发 onConditionChange 事件
      const mergedDataRage = this._getDateRangeFromQs();
      const mergedRemoteVals = this._getRemoteValFromQs();
      const qsStr = this.props.location.search.replace('?', '');
      const qsObj = qs.parse(qsStr);
    this.props.onConditionChange?.({
        ...qsObj,
        ...mergedRemoteVals,
        ...mergedDataRage,
    });
  }

  /**
   * 搜索
   */
  private _handleSearch = () => {
      // 重置页索引，获取form数据并合并，replace url，然后触发onConditionChange
      const formData = this.formRef.current?.getFieldsValue();
      const remoteSearchData = this._getRemoteSearchDataFromFormFields();
      const dateRangeVal = this._getDateRangeObjFromFormFields();

      const currQueryString =  this.props.location.search.replace('?', '');
      const currQsObj = qs.parse(currQueryString);
      const newQsObj = Object.assign({}, {
          ...currQsObj,
          ...formData,
          ...remoteSearchData,
          ...dateRangeVal,
      });
      const redirectPrefix = this.props.location.pathname.replace('/uums', '');
      this.props.history.replace(`${redirectPrefix}?${qs.stringify(newQsObj)}`);
    this.props.onConditionChange?.(newQsObj);
  }
  /**
   * 重置条件
   */
  private _handleReset = () => {
      // 重置页索引，清空form数据，replace url，然后触发onConditionChange
      const formKeys = this.props.items.map(item => item.fieldName);
      const currQueryString =  this.props.location.search.replace('?', '');
      const currQsObj = qs.parse(currQueryString);
      formKeys.forEach(formKeyItem => {
          delete currQsObj[formKeyItem];

          delete currQsObj[formKeyItem + 'StartDate'];
          delete currQsObj[formKeyItem + 'EndDate'];
          delete currQsObj[formKeyItem + 'Label'];
          delete currQsObj[formKeyItem + 'Value'];
      });
      this.formRef.current?.resetFields();
      const redirectPrefix = this.props.location.pathname.replace('/uums', '');
      this.props.history.replace(`${redirectPrefix}?${qs.stringify(currQsObj)}`);
    this.props.onConditionChange?.(currQsObj);
  }

  /**
   * 从queryString中收集 { xxxStartDate,xxxEndDate, yyyStartDate, yyyEndDate } 数据
   */
  private _getDateRangeFromQs = () => {
      const qsStr = this.props.location.search.replace('?', '');
      const qsObj = qs.parse(qsStr);
      const dateFieldArr = this.props.items.filter(item => {
          return item.type === 'DATE_RANGE';
      });
      if (dateFieldArr.length === 0) {
      this.formRef.current?.setFieldsValue(qsObj);
      return;
      }
      // 处理DATE_RANGE特殊类型数据,setFieldsValue之前要将xxxStartDate和xxxEndDate合并
      const dataRangeArr = dateFieldArr.map(item => item.fieldName).map(item => {
          return {
              [item]: [
                  qsObj[item+ 'StartDate'] ? moment(qsObj[item+ 'StartDate'] as string, 'YYYY-MM-DD'): '',
                  qsObj[item+ 'EndDate'] ? moment(qsObj[item+ 'EndDate'] as string, 'YYYY-MM-DD'): '',
              ]
          };
      });
      const mergedDataRage = dataRangeArr.reduce((prev, next) => {
          return {
              ...prev,
              ...next,
          };
      });

      return mergedDataRage;
  }

  private _getRemoteValFromQs = ()=> {
      const qsStr = this.props.location.search.replace('?', '');
      const qsObj = qs.parse(qsStr);
      const remoteSearchFieldArr = this.props.items.filter(item => {
          return item.type === 'REMOTE_SEARCH';
      }).map(item => item.fieldName);
      const remoteSearchOptions = remoteSearchFieldArr.map(item => {
          const itemQsVal = qsObj[item];
          return itemQsVal ? {
              [item]: [{
                  value: (itemQsVal as string).split('_VALUESPLITTER_')[0],
                  label: (itemQsVal as string).split('_VALUESPLITTER_')[1],
              }]
          } : {};
      }).reduce((prev, next) => {
          return {
              ...prev,
              ...next,
          };
      });
      this.setState({
          searchOptions: {
              ...this.state.searchOptions,
              ...remoteSearchOptions,
          },
      });
      const remoteIdVals = remoteSearchFieldArr.map(item => {
          const itemQsVal = qsObj[item] as string;
          return itemQsVal ? {
              [item]: itemQsVal.split('_VALUESPLITTER_')[0]
          } : {};
      }).reduce((prev, next) => {
          return {
              ...prev,
              ...next,
          };
      });

      return remoteIdVals;
  }

  /**
   * 从form中收集 { xxxStartDate,xxxEndDate, yyyStartDate, yyyEndDate } 数据
   */
  private _getDateRangeObjFromFormFields = () => {
      const dateRangeFieldArr = this.props.items.filter(item => {
          return item.type === 'DATE_RANGE';
      }).map(item => item.fieldName);
      const formVals = this.formRef.current?.getFieldsValue();
      const dateRangeVal = dateRangeFieldArr.map(item => {
          const [startDate, endDate] = formVals[item]??[];
          return {
              [item + 'StartDate']: startDate ? moment(startDate).format('YYYY-MM-DD'): '',
              [item + 'EndDate']: endDate ? moment(endDate).format('YYYY-MM-DD'): '',
          };
      }).reduce((prev, next) => {
          return {
              ...prev,
              ...next,
          };
      });

      return dateRangeVal;
  }

  private _getRemoteSearchDataFromFormFields = () => {
      const remoteFieldsArr = this.props.items.filter((item) => {
          return item.type === 'REMOTE_SEARCH';
      });
      const formVals = this.formRef.current?.getFieldsValue();
      const searchOptions = this.state.searchOptions;
      const remoteFieldsDataVal = remoteFieldsArr.map(item => {
          const fieldName = item.fieldName;
          const matchedValArr = searchOptions[fieldName]? searchOptions[fieldName].filter(item => item.value === formVals[fieldName]) : [{ label: '', value: '' }];
          const rtObj = formVals[fieldName] ? {
              [fieldName]: `${formVals[fieldName]}_VALUESPLITTER_${ matchedValArr[0].label }`
          } : {};

          return rtObj;
      }).reduce((prev, next) => {
          return {
              ...prev,
              ...next,
          };
      });

      return remoteFieldsDataVal;
  }

  private _handleRemoteSelectSearch = async (fieldName: string, inputVal: string) => {
      if ( !inputVal) {
          return;
      }
      const matchedSearchCtrl = this.props.items.filter(item => item.fieldName === fieldName);
      if ( matchedSearchCtrl.length === 0 ) {
          return;
      }
      const searchCtrlUrl = matchedSearchCtrl[0].remoteUrl??'';
      if (!searchCtrlUrl) {
          return;
      }
      const matchedDictUrl = this.props.items.filter(item => item.fieldName === fieldName);
      if (matchedDictUrl.length === 0 ) {
          return;
      }
      // 请求数据然后赋值，放在各个项目中去实现
      const dictList = await this.props.getDictDataFn(matchedDictUrl[0].remoteUrl as string, inputVal);

      this.setState({
          searchOptions: {
              ...this.state.searchOptions,
              [fieldName]: dictList,
          },
      });


  }
  private _handleRemoteSelectChange = (fieldName: string, selectedVal: string) => {
    // 暂不处理这个逻辑
  }

  render() {
      const { title, items, cols } = this.props;
      const colSpan = 24 / cols; // 每列占据多少栅格
      const searchOptions = this.state.searchOptions;
      // const remoteSearchCtrlKeys = items.filter(item => item.type === 'REMOTE_SEARCH').map(item => item.fieldName);

      // index 要小于items长度加上1(按钮所在col)
      let formRows = [];
      for (let index = 0; index < items.length + 1; index = index + cols ) {

          // 先循环生成每一行的col，然后将每一行拼接起来
          let rowCols = [];
          for (let j = 0; j < cols; j++) {
              const col = <Col span={colSpan} key={'col' + j}>
                  {
                      items[index + j] ? (<Item name={items[index + j].fieldName} label={items[index + j].label}
                          rules={ items[index + j].isRequired ? [{ required: true, message: `${items[index + j].type === 'INPUT' ? '请填写': '请选择' }` }]: []} >
                          {
                              items[index + j].type === 'INPUT' ? (
                                  <Input type="text" placeholder={items[index + j].placeHolder??''} />
                              ): (
                                  items[index + j].type === 'DATE_RANGE' ? (
                                      <RangePicker style={{width: '100%'}} format="YYYY-MM-DD" />
                                  ): (
                                      items[index + j].type === 'SELECT' ? (<Select>
                                          <Option value={''}>请选择</Option>
                                          {
                                        items[index + j].options?.map((item, optionIndex: number) => {
                                            return <Option key={ items[index + j].fieldName + items[index + j] } value={item.value}>{item.label}</Option>;
                                        })
                                          }
                                      </Select>): (
                                          items[index + j].type === 'REMOTE_SEARCH' ? (<Select showSearch
                                              filterOption={false}
                                              placeholder={items[index + j].placeHolder}
                                              defaultActiveFirstOption={false}
                                              onSearch={(inputVal: string) => {
                                                  this._handleRemoteSelectSearch(items[index + j].fieldName, inputVal);
                                              }}
                                              onChange={(selectedVal: string) => {
                                                  this._handleRemoteSelectChange(items[index + j].fieldName, selectedVal);
                                              }}
                                              notFoundContent={null} >
                                              {
                                                  searchOptions[items[index + j].fieldName] ? (
                                                      searchOptions[items[index + j].fieldName].map(item => {
                                                          return <Option key={item.value} value={item.value}>{item.label}</Option>;
                                                      })
                                                  ) : (<></>)
                                              }
                                          </Select>) : (<></>)
                                      )
                                  )
                              )
                          }
                      </Item>): ( j === cols - 1 ? (<div style={{display: 'flex', justifyContent: 'end'}}>
                          <Button htmlType={'submit'} style={{ marginRight: '10px' }} onClick={this._handleSearch} type="primary" >搜索</Button>
                          <Button onClick={this._handleReset}>重置</Button>
                      </div>): (<></>)
                      )
                  }
              </Col>;
              rowCols.push(col);
          }

          // 将每一行拼接
          formRows.push(<Row key={'row' + index}>{rowCols}</Row>);
      }

      return <div className={styles.queryContainer}>
          <div className={styles.queryHeader}>
              <div className={styles.queryTitle}>{title}</div>
          </div>

          <Form ref={this.formRef} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} colon={true} >
              { formRows }
          </Form>
      </div>;
  }
}

export interface IListQueryItem {
  type: 'INPUT' | 'DATE_RANGE' | 'SELECT' | 'REMOTE_SEARCH';
  fieldName: string;
  label: string;
  isRequired?: boolean;
  placeHolder?: string;
  remoteUrl?: string;
  options?: Array<{
    value: string;
    label: string;
  }>;
}

export default withRouter(ListQuery);
