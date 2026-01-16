export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }

    public: {
        Tables: {
            deals: {
                Row: {
                    assignee_id: string | null
                    avatar_color: string | null
                    client_name: string
                    cnpj: string | null
                    contact_name: string | null
                    created_at: string | null
                    email: string | null
                    id: string
                    phone: string | null
                    pipeline_id: string | null
                    progress: number | null
                    status: string | null
                    tag: string | null
                    title: string
                    updated_at: string | null
                    value: number | null
                    recovered_value: number | null
                }
                Insert: {
                    assignee_id?: string | null
                    avatar_color?: string | null
                    client_name: string
                    cnpj?: string | null
                    contact_name?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    phone?: string | null
                    pipeline_id?: string | null
                    progress?: number | null
                    status?: string | null
                    tag?: string | null
                    title: string
                    updated_at?: string | null
                    value?: number | null
                }
                Update: {
                    assignee_id?: string | null
                    avatar_color?: string | null
                    client_name?: string
                    cnpj?: string | null
                    contact_name?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    phone?: string | null
                    pipeline_id?: string | null
                    progress?: number | null
                    status?: string | null
                    tag?: string | null
                    title?: string
                    updated_at?: string | null
                    value?: number | null
                }
            }
            deal_notes: {
                Row: {
                    id: string
                    deal_id: string
                    content: string
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    deal_id: string
                    content: string
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    deal_id?: string
                    content?: string
                    created_at?: string | null
                }
            }
            deal_tasks: {
                Row: {
                    id: string
                    deal_id: string
                    title: string
                    due_date: string | null
                    is_completed: boolean | null
                    is_urgent: boolean | null
                    assignee_id: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    deal_id: string
                    title: string
                    due_date?: string | null
                    is_completed?: boolean | null
                    is_urgent?: boolean | null
                    assignee_id?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    deal_id?: string
                    title?: string
                    due_date?: string | null
                    is_completed?: boolean | null
                    is_urgent?: boolean | null
                    assignee_id?: string | null
                    created_at?: string | null
                }
            }
            deal_documents: {
                Row: {
                    id: string
                    deal_id: string
                    name: string
                    url: string | null
                    size: string | null
                    type: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    deal_id: string
                    name: string
                    url?: string | null
                    size?: string | null
                    type?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    deal_id?: string
                    name?: string
                    url?: string | null
                    size?: string | null
                    type?: string | null
                    created_at?: string | null
                }
            }
            deal_history: {
                Row: {
                    id: string
                    deal_id: string
                    action_type: string
                    description: string
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    deal_id: string
                    action_type: string
                    description: string
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    deal_id?: string
                    action_type?: string
                    description?: string
                    created_at?: string | null
                }
            }
            partnerships: {
                Row: {
                    id: string
                    name: string
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string | null
                }
            }
            goals: {
                Row: {
                    created_at: string | null
                    current_value: number | null
                    id: string
                    period: string | null
                    target_value: number
                    type: string
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    current_value?: number | null
                    id?: string
                    period?: string | null
                    target_value: number
                    type: string
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    current_value?: number | null
                    id?: string
                    period?: string | null
                    target_value?: number
                    type?: string
                    user_id?: string | null
                }
            }
            pipelines: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                    order_index: number
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                    order_index: number
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name: string
                    order_index: number
                }
            }
            profiles: {
                Row: {
                    avatar_url: string | null
                    created_at: string | null
                    email: string | null
                    id: string
                    name: string | null
                    role: string | null
                    updated_at: string | null
                    theme: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    id: string
                    name?: string | null
                    role?: string | null
                    updated_at?: string | null
                    theme?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    name?: string | null
                    role?: string | null
                    updated_at?: string | null
                    theme?: string | null
                }
            }
            projects: {
                Row: {
                    category: string | null
                    created_at: string | null
                    description: string | null
                    id: string
                    progress: number | null
                    status: string | null
                    team_ids: string[] | null
                    title: string
                }
                Insert: {
                    category?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    progress?: number | null
                    status?: string | null
                    team_ids?: string[] | null
                    title: string
                }
                Update: {
                    category?: string | null
                    created_at?: string | null
                    description?: string | null
                    id?: string
                    progress?: number | null
                    status?: string | null
                    team_ids?: string[] | null
                    title: string
                }
            }
            financial_recoveries: {
                Row: {
                    id: string
                    created_at: string | null
                    client_name: string
                    status: string
                    total_recovered: number
                    partner_percent: number
                    partner_amount: number
                    my_company_percent: number
                    my_company_amount: number
                    other_office_amount: number
                    payment_date: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    client_name: string
                    status?: string
                    total_recovered?: number
                    partner_percent?: number
                    partner_amount?: number
                    my_company_percent?: number
                    my_company_amount?: number
                    other_office_amount?: number
                    payment_date?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    client_name?: string
                    status?: string
                    total_recovered?: number
                    partner_percent?: number
                    partner_amount?: number
                    my_company_percent?: number
                    my_company_amount?: number
                    other_office_amount?: number
                    payment_date?: string | null
                }
                Relationships: []
            }
            financial_retainers: {
                Row: {
                    id: string
                    created_at: string | null
                    client_name: string
                    monthly_fee: number
                    our_share: number
                    active: boolean | null
                    commission_percent: number | null
                    start_date: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    client_name: string
                    monthly_fee?: number
                    our_share?: number
                    active?: boolean | null
                    commission_percent?: number | null
                    start_date?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    client_name?: string
                    monthly_fee?: number
                    our_share?: number
                    active?: boolean | null
                    commission_percent?: number | null
                    start_date?: string | null
                }
                Relationships: []
            }
            financial_retainer_payments: {
                Row: {
                    id: string
                    retainer_id: string | null
                    due_date: string
                    payment_date: string | null
                    amount: number | null
                    status: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    retainer_id?: string | null
                    due_date: string
                    payment_date?: string | null
                    amount?: number | null
                    status?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    retainer_id?: string | null
                    due_date?: string
                    payment_date?: string | null
                    amount?: number | null
                    status?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "financial_retainer_payments_retainer_id_fkey"
                        columns: ["retainer_id"]
                        isOneToOne: false
                        referencedRelation: "financial_retainers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            financial_expenses: {
                Row: {
                    id: string
                    created_at: string | null
                    description: string
                    amount: number
                    category: string | null
                    date: string
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    description: string
                    amount?: number
                    category?: string | null
                    date?: string
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    description?: string
                    amount?: number
                    category?: string | null
                    date?: string
                }
                Relationships: []
            }
            internal_projects: {
                Row: {
                    id: string
                    created_at: string | null
                    title: string
                    description: string | null
                    category: string | null
                    status: string | null
                    start_date: string | null
                    due_date: string | null
                    created_by: string | null
                    progress: number | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    title: string
                    description?: string | null
                    category?: string | null
                    status?: string | null
                    start_date?: string | null
                    due_date?: string | null
                    created_by?: string | null
                    progress?: number | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    title?: string
                    description?: string | null
                    category?: string | null
                    status?: string | null
                    start_date?: string | null
                    due_date?: string | null
                    created_by?: string | null
                    progress?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "internal_projects_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            project_tasks: {
                Row: {
                    id: string
                    created_at: string | null
                    project_id: string
                    title: string
                    assignee_id: string | null
                    due_date: string | null
                    priority: string | null
                    status: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    project_id: string
                    title: string
                    assignee_id?: string | null
                    due_date?: string | null
                    priority?: string | null
                    status?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    project_id?: string
                    title?: string
                    assignee_id?: string | null
                    due_date?: string | null
                    priority?: string | null
                    status?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "project_tasks_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "internal_projects"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "project_tasks_assignee_id_fkey"
                        columns: ["assignee_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            project_documents: {
                Row: {
                    id: string
                    created_at: string | null
                    project_id: string
                    name: string
                    url: string | null
                    size: string | null
                    type: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    project_id: string
                    name: string
                    url?: string | null
                    size?: string | null
                    type?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    project_id?: string
                    name?: string
                    url?: string | null
                    size?: string | null
                    type?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "project_documents_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "internal_projects"
                        referencedColumns: ["id"]
                    }
                ]
            }
            project_members: {
                Row: {
                    id: string
                    created_at: string | null
                    project_id: string
                    user_id: string
                    role: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    project_id: string
                    user_id: string
                    role?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    project_id?: string
                    user_id?: string
                    role?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "project_members_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "internal_projects"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "project_members_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            project_history: {
                Row: {
                    id: string
                    created_at: string | null
                    project_id: string
                    user_id: string | null
                    action_type: string
                    description: string
                }
                Insert: {
                    id?: string
                    created_at?: string | null
                    project_id: string
                    user_id?: string | null
                    action_type: string
                    description: string
                }
                Update: {
                    id?: string
                    created_at?: string | null
                    project_id?: string
                    user_id?: string | null
                    action_type?: string
                    description?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "project_history_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "internal_projects"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "project_history_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            },
            appointments: {
                Row: {
                    id: string
                    user_id: string
                    title: string
                    description: string | null
                    start_time: string
                    end_time: string
                    location: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    title: string
                    description?: string | null
                    start_time: string
                    end_time: string
                    location?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    title?: string
                    description?: string | null
                    start_time?: string
                    end_time?: string
                    location?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "appointments_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
