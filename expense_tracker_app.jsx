// Expense Tracker App - Jetpack Compose + MVVM + Room + Hilt

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class ExpenseTrackerApp : Application()

// MainActivity.kt
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.hilt.navigation.compose.hiltViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ExpenseApp()
        }
    }
}

// ExpenseApp.kt
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.navigation.compose.rememberNavController

@Composable
fun ExpenseApp() {
    val navController = rememberNavController()
    Scaffold(
        topBar = { TopAppBar(title = { Text("Expense Tracker") }) },
    ) {
        Navigation(navController)
    }
}

// Navigation.kt
import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable

@Composable
fun Navigation(navController: NavHostController) {
    NavHost(navController, startDestination = "home") {
        composable("home") { HomeScreen(navController) }
        composable("add") { AddExpenseScreen(navController) }
    }
}

// HomeScreen.kt
@Composable
fun HomeScreen(navController: NavHostController) {
    val viewModel: ExpenseViewModel = hiltViewModel()
    val expenses = viewModel.expenses.collectAsState().value

    Column {
        Button(onClick = { navController.navigate("add") }) {
            Text("Add Expense")
        }
        expenses.forEach {
            Text("${it.title}: ₹${it.amount}")
        }
    }
}

// AddExpenseScreen.kt
@Composable
fun AddExpenseScreen(navController: NavHostController) {
    val viewModel: ExpenseViewModel = hiltViewModel()
    var title by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }

    Column {
        OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") })
        OutlinedTextField(value = amount, onValueChange = { amount = it }, label = { Text("Amount") })
        Button(onClick = {
            viewModel.addExpense(title, amount.toDoubleOrNull() ?: 0.0)
            navController.popBackStack()
        }) {
            Text("Save")
        }
    }
}

// ExpenseViewModel.kt
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ExpenseViewModel @Inject constructor(
    private val repository: ExpenseRepository
) : ViewModel() {
    private val _expenses = MutableStateFlow<List<Expense>>(emptyList())
    val expenses = _expenses.asStateFlow()

    init {
        loadExpenses()
    }

    fun loadExpenses() = viewModelScope.launch {
        _expenses.value = repository.getAll()
    }

    fun addExpense(title: String, amount: Double) = viewModelScope.launch {
        repository.insert(Expense(title = title, amount = amount))
        loadExpenses()
    }
}

// Expense.kt (Entity)
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity
data class Expense(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val title: String,
    val amount: Double
)

// ExpenseDao.kt
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query

@Dao
interface ExpenseDao {
    @Insert
    suspend fun insert(expense: Expense)

    @Query("SELECT * FROM Expense")
    suspend fun getAll(): List<Expense>
}

// ExpenseDatabase.kt
import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [Expense::class], version = 1)
abstract class ExpenseDatabase : RoomDatabase() {
    abstract fun expenseDao(): ExpenseDao
}

// ExpenseRepository.kt
import javax.inject.Inject

class ExpenseRepository @Inject constructor(private val dao: ExpenseDao) {
    suspend fun insert(expense: Expense) = dao.insert(expense)
    suspend fun getAll(): List<Expense> = dao.getAll()
}

// AppModule.kt (Hilt)
import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideDatabase(app: Application): ExpenseDatabase =
        Room.databaseBuilder(app, ExpenseDatabase::class.java, "expense_db").build()

    @Provides
    fun provideDao(db: ExpenseDatabase): ExpenseDao = db.expenseDao()
}
