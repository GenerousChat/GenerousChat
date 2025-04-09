"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  useForm as useHookForm, 
  FormProvider, 
  UseFormReturn, 
  FieldValues,
  SubmitHandler,
  UseFormProps
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface FormProps<T extends FieldValues> extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
}

function Form<T extends FieldValues>({ 
  form, 
  onSubmit, 
  children, 
  className, 
  ...props 
}: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-6", className)}
        {...props}
      >
        {children}
      </form>
    </FormProvider>
  );
}

interface FormFieldProps {
  name: string;
  children: React.ReactNode;
}

function FormField({ name, children }: FormFieldProps) {
  return <div className="space-y-2">{children}</div>;
}

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

function FormLabel({ className, ...props }: FormLabelProps) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}

interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {}

function FormControl({ className, ...props }: FormControlProps) {
  return (
    <div
      className={cn(
        "mt-2",
        className
      )}
      {...props}
    />
  );
}

interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function FormDescription({ className, ...props }: FormDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  name?: string;
}

function FormMessage({ name, className, children, ...props }: FormMessageProps) {
  const { formState } = useHookForm();
  const error = name ? formState.errors[name] : null;
  
  if (!error && !children) {
    return null;
  }
  
  return (
    <p
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {children || (error?.message as React.ReactNode)}
    </p>
  );
}

interface UseZodFormProps<T extends z.ZodType> extends Omit<UseFormProps<z.infer<T>>, "resolver"> {
  schema: T;
}

function useZodForm<T extends z.ZodType>({ schema, ...formProps }: UseZodFormProps<T>) {
  return useHookForm<z.infer<T>>({
    resolver: zodResolver(schema),
    ...formProps,
  });
}

export {
  Form,
  FormField,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useZodForm,
}; 