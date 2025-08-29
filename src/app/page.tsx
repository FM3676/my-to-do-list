"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Todo } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

import { Plus, CalendarIcon, Loader2, Trash2, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isTodoDialogOpen, setIsTodoDialogOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState("");

  const [isSubTaskDialogOpen, setIsSubTaskDialogOpen] = useState(false);
  const [newSubTaskText, setNewSubTaskText] = useState("");
  const [currentTodo, setCurrentTodo] = useState<Todo | null>(null);

  const fetchTodos = useCallback(async (currentUsername: string) => {
    if (!currentUsername) {
      setTodos([]);
      return;
    }
    setLoading(true);
    try {
      const { data: userWithTodos, error } = await supabase
        .from("users")
        .select("*, todos(*, sub_tasks(*))")
        .eq("username", currentUsername)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("获取数据失败:", error);
      }

      if (userWithTodos && userWithTodos.todos) {
        const sortedTodos = userWithTodos.todos.sort(
          (a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        sortedTodos.forEach((todo: { sub_tasks: any[]; }) => {
          if (!todo.sub_tasks) {
            todo.sub_tasks = [];
          } else {
            todo.sub_tasks.sort(
              (a: { created_at: string | number | Date; }, b: { created_at: string | number | Date; }) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          }
        });
        setTodos(sortedTodos);
      } else {
        setTodos([]);
      }
    } catch (err) {
      // <-- THE FINAL FIX IS HERE
      console.error("一个未知错误发生:", err);
      // We can optionally show an alert here as well
      if (err instanceof Error) {
        alert(`加载数据时发生严重错误: ${err.message}`);
      }
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTodos(username);
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [username, fetchTodos]);

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim() || !username.trim()) return;
    setIsSubmitting(true);
    try {
      let { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();
      if (!user) {
        const { data: newUser } = await supabase
          .from("users")
          .insert({ username })
          .select("id")
          .single();
        user = newUser;
      }
      if (!user) throw new Error("无法获取用户信息");

      const { data: newTodo, error } = await supabase
        .from("todos")
        .insert({
          title: newTodoTitle,
          user_id: user.id,
          date: new Date().toISOString().split("T")[0],
        })
        .select("*, sub_tasks(*)")
        .single();
      if (error) throw error;

      newTodo.sub_tasks = [];
      setTodos([newTodo, ...todos]);
      setNewTodoTitle("");
      setIsTodoDialogOpen(false);
    } catch (error) {
      console.error("创建待办失败:", error);
      if (error instanceof Error) {
        alert(`出错了: ${error.message}`);
      } else {
        alert("创建待办时发生了一个未知错误");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", todoId);
      if (error) throw error;
      setTodos(todos.filter((todo) => todo.id !== todoId));
    } catch (error) {
      console.error("删除待办失败:", error);
      if (error instanceof Error) {
        alert(`出错了: ${error.message}`);
      } else {
        alert("删除待办时发生了一个未知错误");
      }
    }
  };

  const handleAddSubTask = async () => {
    if (!newSubTaskText.trim() || !currentTodo) return;
    setIsSubmitting(true);
    try {
      const { data: newSubTask, error } = await supabase
        .from("sub_tasks")
        .insert({ todo_id: currentTodo.id, text: newSubTaskText })
        .select()
        .single();
      if (error) throw error;

      const updatedTodos = todos.map((todo) =>
        todo.id === currentTodo.id
          ? { ...todo, sub_tasks: [...todo.sub_tasks, newSubTask] }
          : todo
      );
      setTodos(updatedTodos);
      setNewSubTaskText("");
      setIsSubTaskDialogOpen(false);
    } catch (error) {
      console.error("创建子项目失败:", error);
      if (error instanceof Error) {
        alert(`出错了: ${error.message}`);
      } else {
        alert("创建子项目时发生了一个未知错误");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSubTask = async (
    subTaskId: string,
    currentState: boolean
  ) => {
    const parentTodo = todos.find((t) =>
      t.sub_tasks.some((st) => st.id === subTaskId)
    );
    if (!parentTodo) return;

    const originalTodos = JSON.parse(JSON.stringify(todos));
    const updatedTodos = todos.map((todo) => {
      if (todo.id === parentTodo.id) {
        const updatedSubTasks = todo.sub_tasks.map((st) =>
          st.id === subTaskId ? { ...st, is_completed: !currentState } : st
        );
        const allSubTasksCompleted =
          updatedSubTasks.length > 0 &&
          updatedSubTasks.every((st) => st.is_completed);
        return {
          ...todo,
          sub_tasks: updatedSubTasks,
          is_completed: allSubTasksCompleted,
        };
      }
      return todo;
    });
    setTodos(updatedTodos);

    try {
      const { error: subTaskError } = await supabase
        .from("sub_tasks")
        .update({ is_completed: !currentState })
        .eq("id", subTaskId);
      if (subTaskError) throw subTaskError;

      const finalParentTodoState = updatedTodos.find(
        (t) => t.id === parentTodo.id
      );
      if (finalParentTodoState) {
        const { error: todoError } = await supabase
          .from("todos")
          .update({ is_completed: finalParentTodoState.is_completed })
          .eq("id", parentTodo.id);
        if (todoError) throw todoError;
      }
    } catch (error) {
      console.error("更新失败，正在回滚UI:", error);
      setTodos(originalTodos);
      if (error instanceof Error) {
        alert(`更新失败，请重试: ${error.message}`);
      } else {
        alert("更新失败，请重试。发生了一个未知错误。");
      }
    }
  };

  const currentDate = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const calculateProgress = (todo: Todo) => {
    if (!todo.sub_tasks || todo.sub_tasks.length === 0) return 0;
    const completedCount = todo.sub_tasks.filter(
      (st) => st.is_completed
    ).length;
    return (completedCount / todo.sub_tasks.length) * 100;
  };

  return (
    // JSX part is unchanged
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          我的待办清单
        </h1>
        <div className="flex items-center gap-2">
          <Input
            id="username"
            placeholder="输入或创建一个用户名..."
            className="max-w-xs text-base"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
      </header>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3 text-xl font-semibold text-gray-700">
          <CalendarIcon className="h-6 w-6" /> <span>{currentDate}</span>
        </div>

        <Dialog open={isTodoDialogOpen} onOpenChange={setIsTodoDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" disabled={!username}>
              <Plus className="mr-2 h-5 w-5" /> 添加新待办
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>添加一个新的待办事项</DialogTitle>
              <DialogDescription>
                为用户 “{username}” 添加一个新任务。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  标题
                </Label>
                <Input
                  id="title"
                  value={newTodoTitle}
                  onChange={(e) => setNewTodoTitle(e.target.value)}
                  placeholder="例如：学习 Supabase"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                onClick={handleAddTodo}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-lg">加载中...</p>
          </div>
        )}

        <AnimatePresence>
          {!loading && username && todos.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center p-12 bg-white rounded-xl shadow-sm border"
            >
              <ListTodo className="mx-auto h-16 w-16 text-gray-300" />
              <h3 className="mt-4 text-xl font-semibold text-gray-800">
                万事俱备！
              </h3>
              <p className="mt-2 text-base text-gray-500">
                你还没有任何待办事项。点击右上角开始添加吧！
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !username && (
          <div className="text-center p-12 bg-white rounded-xl shadow-sm border">
            <h3 className="text-xl font-semibold text-gray-800">欢迎！</h3>
            <p className="mt-2 text-base text-gray-500">
              请输入一个用户名来开始你的待办之旅。
            </p>
          </div>
        )}

        <AnimatePresence>
          {!loading &&
            todos.map((todo) => (
              <motion.div
                key={todo.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              >
                <Card
                  className={`transition-all duration-300 ${
                    todo.is_completed
                      ? "bg-gray-50 opacity-60"
                      : "bg-white hover:shadow-md"
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle
                      className={`text-xl font-semibold ${
                        todo.is_completed
                          ? "line-through text-gray-400"
                          : "text-gray-800"
                      }`}
                    >
                      {todo.title}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Dialog
                        open={
                          isSubTaskDialogOpen && currentTodo?.id === todo.id
                        }
                        onOpenChange={(isOpen) => {
                          if (!isOpen) setCurrentTodo(null);
                          setIsSubTaskDialogOpen(isOpen);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentTodo(todo)}
                          >
                            <Plus className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>
                              为 “{currentTodo?.title}” 添加子项目
                            </DialogTitle>
                            <DialogDescription>
                              输入子项目的具体内容，然后点击添加。
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label
                                htmlFor="subtask-text"
                                className="text-right"
                              >
                                内容
                              </Label>
                              <Input
                                id="subtask-text"
                                value={newSubTaskText}
                                onChange={(e) =>
                                  setNewSubTaskText(e.target.value)
                                }
                                placeholder="例如：完成第一章节"
                                className="col-span-3"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="submit"
                              onClick={handleAddSubTask}
                              disabled={isSubmitting}
                            >
                              {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              添加
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
                            <AlertDialogDescription>
                              此操作无法撤销。这将会永久删除 “{todo.title}”
                              以及其下所有子项目。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTodo(todo.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-5">
                    {todo.sub_tasks?.length > 0 && (
                      <div className="space-y-4">
                        <Progress
                          value={calculateProgress(todo)}
                          className="h-2"
                        />
                        <div className="space-y-3">
                          {todo.sub_tasks.map((subTask) => (
                            <div
                              key={subTask.id}
                              className="flex items-center gap-3"
                            >
                              <Checkbox
                                id={`subtask-${subTask.id}`}
                                checked={subTask.is_completed}
                                onCheckedChange={() =>
                                  handleToggleSubTask(
                                    subTask.id,
                                    subTask.is_completed
                                  )
                                }
                                className="h-5 w-5"
                              />
                              <Label
                                htmlFor={`subtask-${subTask.id}`}
                                className={`text-base font-medium transition-colors ${
                                  subTask.is_completed
                                    ? "line-through text-gray-400"
                                    : "text-gray-700"
                                }`}
                              >
                                {subTask.text}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
