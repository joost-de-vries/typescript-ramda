type Err = any
type Try<T> = T | Err
type CB<T> = (err?: any, value?: T) => void   // union types, generics and typeguards unfortunatly don't seem to mix because of type erasure
type AsyncValue<T> = (g: CB<T>) => Try<T>

class Callback<A>{
  constructor(private f: AsyncValue<A>) {
  }

  run(callback: CB<A>): void {
    try {
      return this.f(callback)
    } catch (ex) {
      return callback(ex)
    }
  }

  map<B>(g: (a: A) => B): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?: Err, result?: A) => {
        if (!!error) {
          callback(error, null)
        } else {
          callback(null, g(result))
        }
      })
    })
  }

  bind<B>(g: (a: A) => Callback<B>): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?: Err, result?: A) => {
        if (!!error) {
          callback(error, null)
        } else {
          g(result).run(callback)
        }
      })
    })
  }

  then<B>(g: (a: A) => B | Callback<B>): Callback<B> {
    return new Callback((callback: CB<B>) => {
      this.run((error?: Err, result?: A) => {
        if (!!error) {
          callback(error, null)
        } else {
          try {
            const y: B | Callback<B> = g(result)
            if (y instanceof Callback) {
              y.run(callback)
            } else {
              callback(null, y)
            }
          } catch (ex) {
            callback(ex, null)
          }
        }
      })
    })
  }

  bindTo(g: (x: A, cb: CB<A>) => Try<A>) {
    return this.bind(Callback.from(g))
  }

  static pure<T>(x: T) {
    return new Callback<T>(((cb: CB<T>) => cb(null, x)))
  }

  static resolve = Callback.pure

  // Callback.from casts f into a Callback instance, where
  // f is a function that takes x and a callback function
  static from<T>(f: (x: T, cb: CB<T>) => Try<T>): (x: T) => Callback<T> {
    return (x: T) => new Callback(cb => f(x, cb))
  }
}


