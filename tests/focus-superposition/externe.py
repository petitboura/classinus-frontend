import tkinter as tk, sys, os
dossier = sys.argv[1]
r = tk.Tk()
r.title('Fenetre externe test')
r.geometry('500x300+0+0')
t = tk.Text(r)
t.pack()
r.lift()
r.attributes('-topmost', True)
t.focus_force()
def maj():
    try:
        etat = str(r.focus_displayof() is not None) + '|' + t.get('1.0', 'end').strip()
        open(os.path.join(dossier, 'statut-externe'), 'w').write(etat)
    except Exception:
        pass
    r.after(100, maj)
open(os.path.join(dossier, 'externe-prete'), 'w').write('ok')
maj()
r.mainloop()
