export interface SubTask {
  id: string;
  text: string;
  is_completed: boolean;
  todo_id: string;
  created_at: string;
}

export interface Todo {
  id: string;
  title: string;
  is_completed: boolean;
  date: string;
  user_id: string;
  created_at: string;
  sub_tasks: SubTask[]; // 嵌套子项目数组
}
