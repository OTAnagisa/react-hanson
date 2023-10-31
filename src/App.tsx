import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowParams,
} from '@mui/x-data-grid'
import axios from 'axios'
import React from 'react'
import { useEffect, useState } from 'react'

import RestoreIcon from '@mui/icons-material/Restore'
import DeleteIcon from '@mui/icons-material/Delete'
import Header from './components/Header'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'

import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers'

import { ja } from 'date-fns/locale'

type FilterStatus = {
  readonly code: '1' | '2' | '3' | '4'
  readonly name: string
}

type Todo = {
  readonly id: string
  user_name: string
  contents: string
  deadline_str: string
  is_completed: boolean
  is_trashed: boolean
}

type User = {
  readonly id: string
  readonly full_name: string
}

export const App = () => {
  const filterStatusList: readonly FilterStatus[] = [
    { code: '1', name: '全て' },
    { code: '2', name: '未完了' },
    { code: '3', name: '完了済み' },
    { code: '4', name: 'ゴミ箱' },
  ]

  const enum FilterStatusCode {
    All = '1',
    Uncompleted = '2',
    Completed = '3',
    Trashed = '4',
  }

  const [newTodoText, setNewTodoText] = useState('')
  // NOTE: nullやundefinedが入ると、uncontrolled to controlledのエラーが出るのエラーになるため、文字列で管理する
  const [newTodoDeadline, setNewTodoDeadline] = useState('')
  const [newTodoUser, setNewTodoUser] = useState('')
  const [filterStatusCode, setFilterStatusCode] = useState<FilterStatusCode>(
    FilterStatusCode.All
  )
  const [userList, setUserList] = useState<User[]>([])
  const [todoList, setTodoList] = useState<Todo[]>([])

  // 初期表示時
  useEffect(() => {
    fetchUsers()
    fetchTodos(FilterStatusCode.All)
  }, [])

  // ユーザー取得
  const fetchUsers = async () => {
    const res = await axios.get('http://localhost:8000/user')
    setUserList(res.data)
  }

  // Todoリスト取得
  const fetchTodos = async (selectFilter: FilterStatusCode) => {
    const params: { [name: string]: Boolean } = {
      is_trashed: selectFilter === FilterStatusCode.Trashed,
    }

    if (
      [FilterStatusCode.Completed, FilterStatusCode.Uncompleted].includes(
        selectFilter
      )
    ) {
      params.is_completed = selectFilter === FilterStatusCode.Completed
    }

    const res = await axios.get('http://localhost:8000/todo', { params })
    setTodoList(res.data)
  }

  // フィルター選択
  const handleFilter = (selectFilter: FilterStatusCode) => {
    setFilterStatusCode(selectFilter)
    // フィルター選択後、Todoリストを再取得
    fetchTodos(selectFilter)
  }

  // 新規Todoテキスト変更
  const handleTodoTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    setNewTodoText(e.target.value)
  }

  // 新規Todo期限変更
  const handleTodoDeadlineChange = (value: Date | null) => {
    if (!value) return
    setNewTodoDeadline(value.toString())
  }

  // 新規Todoユーザー変更
  const handleTodoUserChange = (user_id: string) => {
    setNewTodoUser(user_id)
  }

  // 新規Todo登録
  const handleTodoSubmit = async () => {
    // 未入力の場合は登録しない
    if (!newTodoText) return

    const params = {
      contents: newTodoText,
      deadline_at: new Date(newTodoDeadline),
      user_id: newTodoUser,
    }
    const headers = { 'Content-Type': 'application/json' }

    await axios
      .post('http://localhost:8000/todo', params, { headers })
      .catch((err) => {
        alert(err)
      })

    // 登録後、Todoリストを再取得
    fetchTodos(filterStatusCode)
    // テキストのみ初期化
    setNewTodoText('')
  }

  // 編集
  const handleEdit = React.useCallback(
    async <K extends keyof Todo, V extends Todo[K]>(
      id: string,
      key: K,
      value: V
    ) => {
      const params = { [key]: value }
      const headers = { 'Content-Type': 'application/json' }

      await axios
        .put(`http://localhost:8000/todo/${id}`, params, { headers })
        .catch((err) => {
          alert(err)
        })

      fetchTodos(filterStatusCode)
    },
    []
  )

  // ゴミ箱
  const handleDetailClick = React.useCallback(
    (params: GridRowParams) => (event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      handleEdit(params.row.id, 'is_trashed', !params.row.is_trashed)
    },
    []
  )

  // ゴミ箱を空にする（削除）
  const handleEmptyTrashBox = async () => {
    await axios.put('http://localhost:8000/todo/trash_box').catch((err) => {
      alert(err)
    })

    fetchTodos(filterStatusCode)
  }

  // ゴミ箱ボタン
  const getDeleteAction = React.useCallback(
    (params: GridRowParams) => [
      <GridActionsCellItem
        key={params.row.id}
        label=""
        icon={
          params.row.is_trashed ? (
            <RestoreIcon sx={{ color: '#1e8cb0' }} />
          ) : (
            <DeleteIcon sx={{ color: '#1e8cb0' }} />
          )
        }
        onClick={handleDetailClick(params)}
      />,
    ],
    [handleDetailClick]
  )

  // グリッドカラム定義
  const columns: GridColDef[] = [
    {
      field: 'is_completed',
      headerName: '完了',
      type: 'boolean',
      width: 100,
      renderCell: (params) => (
        <input
          type="checkbox"
          checked={params.row.is_completed}
          disabled={params.row.is_trashed}
          onChange={() =>
            handleEdit(params.row.id, 'is_completed', !params.row.is_completed)
          }
        />
      ),
    },
    {
      field: 'user_name',
      headerName: 'ユーザー',
      width: 200,
    },
    {
      field: 'contents',
      headerName: '内容',
      width: 600,
    },
    {
      field: 'deadline_str',
      headerName: '期限',
      width: 150,
    },
    {
      field: 'button',
      headerName: '',
      width: 100,
      type: 'actions',
      getActions: getDeleteAction,
    },
  ]

  // 表示
  return (
    <div>
      <Header />
      <Box sx={{ width: '80%', maxWidth: '1200px', margin: '20px auto' }}>
        <Card sx={{ margin: '20px 0 ', padding: '20px' }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <div>新規Todo</div>
            </Grid>
            <Grid item xs={7}>
              <TextField
                id="todo-text"
                label="内容"
                sx={{ width: '100%' }}
                size="small"
                value={newTodoText}
                onChange={(e) => handleTodoTextChange(e)}
              />
            </Grid>
            <Grid item xs={2}>
              <LocalizationProvider
                dateAdapter={AdapterDateFns}
                adapterLocale={ja}
              >
                <DateTimePicker
                  label="期限"
                  value={newTodoDeadline ? new Date(newTodoDeadline) : null}
                  onChange={(value) => handleTodoDeadlineChange(value)}
                  sx={{ width: '100%' }}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={2}>
              <FormControl sx={{ width: '100%' }} size="small">
                <InputLabel id="new-todo-user-label">担当者</InputLabel>
                <Select
                  labelId="new-todo-user-label"
                  id="new-todo-user"
                  value={newTodoUser}
                  label="Age"
                  onChange={(e) => handleTodoUserChange(e.target.value)}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {userList.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={1}>
              <Button variant="outlined" onClick={handleTodoSubmit}>
                登録
              </Button>
            </Grid>
          </Grid>
        </Card>
        {
          <Card>
            <CardContent>
              <Select
                defaultValue={FilterStatusCode.All}
                onChange={(e) =>
                  handleFilter(e.target.value as FilterStatusCode)
                }
                size="small"
                sx={{ width: 120, marginBottom: 2 }}
              >
                {filterStatusList.map((filterStatus) => (
                  <MenuItem key={filterStatus.code} value={filterStatus.code}>
                    {filterStatus.name}
                  </MenuItem>
                ))}
              </Select>
              {filterStatusCode === FilterStatusCode.Trashed ? (
                <Button onClick={handleEmptyTrashBox}>ゴミ箱を空にする</Button>
              ) : (
                <div></div>
              )}
              <div style={{ height: 400 }}>
                <DataGrid
                  rows={todoList}
                  columns={columns}
                  pageSizeOptions={[5, 10]}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 5, page: 0 },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        }
      </Box>
    </div>
  )
}
