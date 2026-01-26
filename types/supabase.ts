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
            appointments: {
                Row: {
                    created_at: string | null
                    description: string | null
                    end_time: string
                    id: string
                    location: string | null
                    start_time: string
                    title: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    description?: string | null
                    end_time: string
                    id?: string
                    location?: string | null
                    start_time: string
                    title: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    description?: string | null
                    end_time?: string
                    id?: string
                    location?: string | null
                    start_time?: string
                    title?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "appointments_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            deal_documents: {
                Row: {
                    created_at: string | null
                    deal_id: string
                    id: string
                    name: string
                    size: string | null
                    type: string | null
                    url: string | null
                }
                Insert: {
                    created_at?: string | null
                    deal_id: string
                    id?: string
                    name: string
                    size?: string | null
                    type?: string | null
                    url?: string | null
                }
                Update: {
                    created_at?: string | null
                    deal_id?: string
                    id?: string
                    name?: string
                    size?: string | null
                    type?: string | null
                    url?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "deal_documents_deal_id_fkey"
                        columns: ["deal_id"]
                        isOneToOne: false
                        referencedRelation: "deals"
                        referencedColumns: ["id"]
                    },
                ]
            }
            deal_history: {
                Row: {
                    action_type: string
                    created_at: string | null
                    deal_id: string
                    description: string
                    id: string
                    user_id: string | null
                }
                Insert: {
                    action_type: string
                    created_at?: string | null
                    deal_id: string
                    description: string
                    id?: string
                    user_id?: string | null
                }
                Update: {
                    action_type?: string
                    created_at?: string | null
                    deal_id?: string
                    description?: string
                    id?: string
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "deal_history_deal_id_fkey"
                        columns: ["deal_id"]
                        isOneToOne: false
                        referencedRelation: "deals"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "deal_history_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            deal_notes: {
                Row: {
                    content: string
                    created_at: string | null
                    deal_id: string
                    id: string
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    deal_id: string
                    id?: string
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    deal_id?: string
                    id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "deal_notes_deal_id_fkey"
                        columns: ["deal_id"]
                        isOneToOne: false
                        referencedRelation: "deals"
                        referencedColumns: ["id"]
                    },
                ]
            }
            project_notes: {
                Row: {
                    content: string
                    created_at: string | null
                    project_id: string
                    id: string
                }
                Insert: {
                    content: string
                    created_at?: string | null
                    project_id: string
                    id?: string
                }
                Update: {
                    content?: string
                    created_at?: string | null
                    project_id?: string
                    id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "project_notes_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "internal_projects"
                        referencedColumns: ["id"]
                    },
                ]
            }
            deal_tasks: {
                Row: {
                    assignee_id: string | null
                    assignee_ids: string[] | null
                    created_at: string | null
                    deal_id: string
                    description: string | null
                    due_date: string | null
                    id: string
                    is_completed: boolean | null
                    is_urgent: boolean | null
                    priority: string | null
                    title: string
                }
                Insert: {
                    assignee_id?: string | null
                    assignee_ids?: string[] | null
                    created_at?: string | null
                    deal_id: string
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    is_completed?: boolean | null
                    is_urgent?: boolean | null
                    priority?: string | null
                    title: string
                }
                Update: {
                    assignee_id?: string | null
                    assignee_ids?: string[] | null
                    created_at?: string | null
                    deal_id?: string
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    is_completed?: boolean | null
                    is_urgent?: boolean | null
                    priority?: string | null
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "deal_tasks_assignee_id_fkey"
                        columns: ["assignee_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "deal_tasks_deal_id_fkey"
                        columns: ["deal_id"]
                        isOneToOne: false
                        referencedRelation: "deals"
                        referencedColumns: ["id"]
                    },
                ]
            }
            deals: {
                Row: {
                    assignee_id: string | null
                    associated_companies: Json | null
                    avatar_color: string | null
                    client_name: string
                    cnpj: string | null
                    contact_name: string | null
                    created_at: string | null
                    custom_fields: Json | null
                    email: string | null
                    id: string
                    phone: string | null
                    phone_secondary: string | null
                    pipeline_id: string | null
                    progress: number | null
                    recovered_value: number | null
                    status: string | null
                    tag: string | null
                    title: string
                    updated_at: string | null
                    value: number | null
                }
                Insert: {
                    assignee_id?: string | null
                    associated_companies?: Json | null
                    avatar_color?: string | null
                    client_name: string
                    cnpj?: string | null
                    contact_name?: string | null
                    created_at?: string | null
                    custom_fields?: Json | null
                    email?: string | null
                    id?: string
                    phone?: string | null
                    phone_secondary?: string | null
                    pipeline_id?: string | null
                    progress?: number | null
                    recovered_value?: number | null
                    status?: string | null
                    tag?: string | null
                    title: string
                    updated_at?: string | null
                    value?: number | null
                }
                Update: {
                    assignee_id?: string | null
                    associated_companies?: Json | null
                    avatar_color?: string | null
                    client_name?: string
                    cnpj?: string | null
                    contact_name?: string | null
                    created_at?: string | null
                    custom_fields?: Json | null
                    email?: string | null
                    id?: string
                    phone?: string | null
                    phone_secondary?: string | null
                    pipeline_id?: string | null
                    progress?: number | null
                    recovered_value?: number | null
                    status?: string | null
                    tag?: string | null
                    title?: string
                    updated_at?: string | null
                    value?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "deals_assignee_id_fkey"
                        columns: ["assignee_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "deals_pipeline_id_fkey"
                        columns: ["pipeline_id"]
                        isOneToOne: false
                        referencedRelation: "pipelines"
                        referencedColumns: ["id"]
                    },
                ]
            }
            goals: {
                Row: {
                    created_at: string | null
                    current_value: number | null
                    id: string
                    is_archived: boolean | null
                    period: string | null
                    period_key: string | null
                    target_value: number
                    type: string
                    user_id: string | null
                }
                Insert: {
                    created_at?: string | null
                    current_value?: number | null
                    id?: string
                    is_archived?: boolean | null
                    period?: string | null
                    period_key?: string | null
                    target_value: number
                    type: string
                    user_id?: string | null
                }
                Update: {
                    created_at?: string | null
                    current_value?: number | null
                    id?: string
                    is_archived?: boolean | null
                    period?: string | null
                    period_key?: string | null
                    target_value?: number
                    type?: string
                    user_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "goals_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            internal_projects: {
                Row: {
                    category: string
                    created_at: string | null
                    created_by: string | null
                    description: string | null
                    due_date: string | null
                    id: string
                    progress: number | null
                    start_date: string | null
                    status: string | null
                    title: string
                }
                Insert: {
                    category: string
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    progress?: number | null
                    start_date?: string | null
                    status?: string | null
                    title: string
                }
                Update: {
                    category?: string
                    created_at?: string | null
                    created_by?: string | null
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    progress?: number | null
                    start_date?: string | null
                    status?: string | null
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "internal_projects_created_by_fkey"
                        columns: ["created_by"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                ]
            }
            partnerships: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                }
                Relationships: []
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
                    name?: string
                    order_index?: number
                }
                Relationships: []
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
                }
                Insert: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    id: string
                    name?: string | null
                    role?: string | null
                    updated_at?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    created_at?: string | null
                    email?: string | null
                    id?: string
                    name?: string | null
                    role?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            project_tasks: {
                Row: {
                    assignee_id: string | null
                    assignee_ids: string[] | null
                    created_at: string | null
                    description: string | null
                    due_date: string | null
                    id: string
                    priority: string | null
                    project_id: string | null
                    status: string | null
                    title: string
                }
                Insert: {
                    assignee_id?: string | null
                    assignee_ids?: string[] | null
                    created_at?: string | null
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    priority?: string | null
                    project_id?: string | null
                    status?: string | null
                    title: string
                }
                Update: {
                    assignee_id?: string | null
                    assignee_ids?: string[] | null
                    created_at?: string | null
                    description?: string | null
                    due_date?: string | null
                    id?: string
                    priority?: string | null
                    project_id?: string | null
                    status?: string | null
                    title?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "project_tasks_assignee_id_fkey"
                        columns: ["assignee_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "project_tasks_project_id_fkey"
                        columns: ["project_id"]
                        isOneToOne: false
                        referencedRelation: "internal_projects"
                        referencedColumns: ["id"]
                    },
                ]
            }
            project_history: {
                Row: {
                    action_type: string
                    created_at: string | null
                    description: string
                    id: string
                    project_id: string
                    user_id: string | null
                }
                Insert: {
                    action_type: string
                    created_at?: string | null
                    description: string
                    id?: string
                    project_id: string
                    user_id?: string | null
                }
                Update: {
                    action_type?: string
                    created_at?: string | null
                    description?: string
                    id?: string
                    project_id?: string
                    user_id?: string | null
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
                    },
                ]
            }
            project_documents: {
                Row: {
                    created_at: string | null
                    id: string
                    name: string
                    project_id: string
                    size: string | null
                    type: string | null
                    url: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    name: string
                    project_id: string
                    size?: string | null
                    type?: string | null
                    url?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    name?: string
                    project_id?: string
                    size?: string | null
                    type?: string | null
                    url?: string | null
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
                    created_at: string | null
                    id: string
                    project_id: string
                    role: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    project_id: string
                    role: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    project_id?: string
                    role?: string
                    user_id?: string
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
            financial_recoveries: {
                Row: {
                    amount: number
                    client_name: string
                    commission_percent: number | null
                    created_at: string | null
                    date: string | null
                    id: string
                    my_company_amount: number | null
                    status: string
                    total_recovered: number | null
                }
                Insert: {
                    amount: number
                    client_name: string
                    commission_percent?: number | null
                    created_at?: string | null
                    date?: string | null
                    id?: string
                    my_company_amount?: number | null
                    status: string
                    total_recovered?: number | null
                }
                Update: {
                    amount?: number
                    client_name?: string
                    commission_percent?: number | null
                    created_at?: string | null
                    date?: string | null
                    id?: string
                    my_company_amount?: number | null
                    status?: string
                    total_recovered?: number | null
                }
                Relationships: []
            }
            financial_retainers: {
                Row: {
                    active: boolean | null
                    amount: number
                    client_name: string
                    commission_percent: number | null
                    created_at: string | null
                    id: string
                    monthly_fee: number
                    start_date: string | null
                }
                Insert: {
                    active?: boolean | null
                    amount: number
                    client_name: string
                    commission_percent?: number | null
                    created_at?: string | null
                    id?: string
                    monthly_fee: number
                    start_date?: string | null
                }
                Update: {
                    active?: boolean | null
                    amount?: number
                    client_name?: string
                    commission_percent?: number | null
                    created_at?: string | null
                    id?: string
                    monthly_fee?: number
                    start_date?: string | null
                }
                Relationships: []
            }
            financial_retainer_payments: {
                Row: {
                    amount: number
                    created_at: string | null
                    date: string | null
                    due_date: string | null
                    id: string
                    payment_date: string | null
                    retainer_id: string
                    status: string
                }
                Insert: {
                    amount: number
                    created_at?: string | null
                    date?: string | null
                    due_date?: string | null
                    id?: string
                    payment_date?: string | null
                    retainer_id: string
                    status: string
                }
                Update: {
                    amount?: number
                    created_at?: string | null
                    date?: string | null
                    due_date?: string | null
                    id?: string
                    payment_date?: string | null
                    retainer_id?: string
                    status?: string
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
                    amount: number
                    category: string
                    created_at: string | null
                    date: string | null
                    description: string
                    id: string
                    status: string
                }
                Insert: {
                    amount: number
                    category: string
                    created_at?: string | null
                    date?: string | null
                    description: string
                    id?: string
                    status: string
                }
                Update: {
                    amount?: number
                    category?: string
                    created_at?: string | null
                    date?: string | null
                    description?: string
                    id?: string
                    status?: string
                }
                Relationships: []
            }
            site_settings: {
                Row: {
                    created_at: string | null
                    id: string
                    is_global_enabled: boolean | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    is_global_enabled?: boolean | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    is_global_enabled?: boolean | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            user_permissions: {
                Row: {
                    created_at: string | null
                    id: string
                    permission_key: string
                    user_id: string
                }
                Insert: {
                    created_at?: string | null
                    id?: string
                    permission_key: string
                    user_id: string
                }
                Update: {
                    created_at?: string | null
                    id?: string
                    permission_key?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_permissions_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
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

type PublicSchema = Database["public"]

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
    }
    ? R
    : never
    : never

export type TablesInsert<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
    TableName extends PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Omit<Database, "__InternalSupabase"> },
    EnumName extends PublicEnumNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Omit<Database, "__InternalSupabase"> }
    ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
